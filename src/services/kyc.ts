import "server-only";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { waSend } from "@/services/whatsapp";
import { uploadAvatar, toPhotoUrl } from "@/lib/storage";

export type KycStatus =
  | "not_submitted"
  | "pending_counter"
  | "pending_sales_rep"
  | "pending_admin"
  | "approved"
  | "rejected";

export type KhatiProfileDTO = {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  address?: string;
  dob?: string;
  kycStatus: KycStatus;
  registrationToken?: string;
  counterId?: string;
};

export type PendingKhatiDTO = {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  address?: string;
  dob?: string;
  kycStatus: KycStatus;
  submittedAt?: string;
};

export async function getKhatiByToken(token: string): Promise<KhatiProfileDTO | null> {
  await connectDB();
  const user = await User.findOne({ registrationToken: token, role: "khati" }).lean();
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name ?? "",
    phone: user.phone ?? "",
    photoUrl: toPhotoUrl(user.photoUrl) || undefined,
    address: user.address ?? undefined,
    dob: user.dob ? new Date(user.dob as Date).toISOString().slice(0, 10) : undefined,
    kycStatus: (user.kycStatus as KycStatus) ?? "not_submitted",
    registrationToken: user.registrationToken ?? undefined,
    counterId: user.counterId ? String(user.counterId) : undefined,
  };
}

export async function submitKhatiProfile(
  token: string,
  data: { address: string; dob: string; email?: string; photoData?: { buffer: Buffer; contentType: string; ext: string } },
): Promise<{ ok: true } | { error: string }> {
  await connectDB();
  const user = await User.findOne({ registrationToken: token, role: "khati" });
  if (!user) return { error: "Invalid or expired registration link." };
  if (user.kycStatus !== "not_submitted") return { error: "Registration already submitted." };

  user.address = data.address.trim();
  user.dob = new Date(data.dob);
  if (data.email) user.email = data.email.toLowerCase();
  user.kycStatus = "pending_admin";

  if (data.photoData) {
    try {
      user.photoUrl = await uploadAvatar(String(user._id), data.photoData.buffer, data.photoData.contentType, data.photoData.ext);
    } catch (err) {
      // Photo upload failure is non-fatal
      console.error("[kyc] Photo upload failed:", err);
    }
  }

  await user.save();

  // Notify admin
  const admin = await User.findOne({ role: "admin" }).lean();
  if (admin?.phone) {
    waSend(
      admin.phone,
      `🆕 *नई खाती पंजीकरण | New Khati Registration*\n\n*${user.name}* (${user.phone}) ने अपना प्रोफाइल जमा कर दिया है और आपकी मंजूरी का इंतज़ार कर रहे हैं।\n*${user.name}* has submitted their profile and is awaiting your approval.\n\nDoorSmith ऐप पर लॉग इन करें और मंजूरी दें।\nLog in to DoorSmith to review and approve.`,
      "kyc",
    ).catch((err) => console.error("[kyc] Admin WA notify failed:", err));
  }

  return { ok: true };
}

export type KycPage = {
  items: PendingKhatiDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

async function paginatedKyc(
  query: Record<string, unknown>,
  opts: { page?: number; pageSize?: number; q?: string },
): Promise<KycPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  if (opts.q) query.name = { $regex: opts.q, $options: "i" };
  const total = await User.countDocuments(query);
  const docs = await User.find(query)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();
  return { items: docs.map(toDTO), total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listPendingForCounter(
  counterId: string,
  opts: { page?: number; pageSize?: number; q?: string } = {},
): Promise<KycPage> {
  await connectDB();
  return paginatedKyc({ role: "khati", counterId, kycStatus: "pending_counter" }, opts);
}

export async function listPendingForSalesRep(
  salesRepId: string,
  opts: { page?: number; pageSize?: number; q?: string } = {},
): Promise<KycPage> {
  await connectDB();
  const counters = await User.find({ role: "counter", createdBy: salesRepId }).select("_id").lean();
  const counterIds = counters.map((c) => c._id);
  // Sales rep has read-only view of all pending khatis in their counters.
  return paginatedKyc({
    role: "khati",
    counterId: { $in: counterIds },
    kycStatus: { $in: ["pending_counter", "pending_sales_rep", "pending_admin"] },
  }, opts);
}

export async function listPendingForAdmin(
  opts: { page?: number; pageSize?: number; q?: string } = {},
): Promise<KycPage> {
  await connectDB();
  // Show all khatis who have submitted but aren't yet approved/rejected,
  // regardless of which stage they're in (covers legacy pending_counter /
  // pending_sales_rep records from the old multi-stage flow).
  return paginatedKyc({
    role: "khati",
    kycStatus: { $in: ["pending_counter", "pending_sales_rep", "pending_admin"] },
  }, opts);
}

export async function approveKyc(actorId: string, actorRole: string, khatiId: string): Promise<void> {
  await connectDB();
  const khati = await User.findById(khatiId);
  if (!khati || khati.role !== "khati") throw new Error("Khati not found.");

  if (actorRole !== "admin") throw new Error("Not authorized.");
  const pendingStatuses = ["pending_counter", "pending_sales_rep", "pending_admin"];
  if (!pendingStatuses.includes(khati.kycStatus as string)) throw new Error("Already processed.");

  khati.kycStatus = "approved";
  khati.status = "active";
  khati.registrationToken = undefined;
  await khati.save();

  if (khati.phone) {
    waSend(
      khati.phone,
      `🎉 *बधाई हो, ${khati.name}! | Congratulations, ${khati.name}!*\n\nआपका DoorSmith पंजीकरण स्वीकृत हो गया है! अब आप लॉग इन करके QR स्कैन शुरू कर सकते हैं।\nYour DoorSmith registration has been approved! You can now log in and start scanning QR codes.\n\nDoorSmith ऐप खोलें और लॉग इन करें  आपका खाती खाता तैयार है! 🚀\nOpen DoorSmith and log in  your khati account is ready!`,
      "kyc",
    ).catch((err) => console.error("[kyc] Khati approval WA failed:", err));
  }
}

export async function rejectKyc(actorId: string, actorRole: string, khatiId: string, reason: string): Promise<void> {
  await connectDB();
  const khati = await User.findById(khatiId);
  if (!khati || khati.role !== "khati") throw new Error("Khati not found.");

  if (actorRole !== "admin") throw new Error("Not authorized.");
  const pendingStatuses = ["pending_counter", "pending_sales_rep", "pending_admin"];
  if (!pendingStatuses.includes(khati.kycStatus as string)) throw new Error("Not authorized to reject at this stage.");

  khati.kycStatus = "rejected";
  await khati.save();

  if (khati.phone) {
    waSend(
      khati.phone,
      `❌ *खाती पंजीकरण अस्वीकृत | Khati Registration Rejected*\n\nप्रिय *${khati.name}*, दुर्भाग्यवश आपका DoorSmith पंजीकरण अभी स्वीकृत नहीं हो सका।\nDear *${khati.name}*, unfortunately your DoorSmith registration could not be approved at this time.\n\n*कारण | Reason:* ${reason || "कोई कारण नहीं दिया गया | No reason provided."}\n\nकृपया सहायता के लिए अपने काउंटर से संपर्क करें।\nPlease contact your counter for further assistance.`,
      "kyc",
    ).catch((err) => console.error("[kyc] Khati rejection WA failed:", err));
  }
}

function toDTO(d: Record<string, unknown>): PendingKhatiDTO {
  return {
    id: String(d._id),
    name: String(d.name ?? ""),
    phone: String(d.phone ?? ""),
    photoUrl: toPhotoUrl(d.photoUrl as string) || undefined,
    address: d.address as string | undefined,
    dob: d.dob ? new Date(d.dob as Date).toISOString().slice(0, 10) : undefined,
    kycStatus: (d.kycStatus as KycStatus) ?? "not_submitted",
    submittedAt: d.updatedAt ? new Date(d.updatedAt as Date).toISOString() : undefined,
  };
}
