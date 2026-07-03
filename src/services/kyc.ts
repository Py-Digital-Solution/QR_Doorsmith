import "server-only";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { waSend } from "@/services/whatsapp";
import { notifyCounterKycToAdmin } from "@/services/wa-notify";
import { uploadAvatar, toPhotoUrl } from "@/lib/storage";
import { hashPassword } from "@/lib/password";

export type KycStatus =
  | "not_submitted"
  | "pending_counter"
  | "pending_sales_rep"
  | "pending_admin"
  | "approved"
  | "rejected";

export type KhatiProfileDTO = {
  id: string;
  role: "khati" | "counter";
  name: string;
  phone: string;
  photoUrl?: string;
  address?: string;
  dob?: string;
  kycStatus: KycStatus;
  registrationToken?: string;
  counterId?: string;
  /** Counters only: registration is self-service, so this tells the page whether it's already done. */
  completed?: boolean;
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

/** Looks up either a khati or a counter by their registration token  both now onboard via the same public link. */
export async function getKhatiByToken(token: string): Promise<KhatiProfileDTO | null> {
  await connectDB();
  const user = await User.findOne({
    registrationToken: token,
    role: { $in: ["khati", "counter"] },
  }).lean();
  if (!user) return null;
  return {
    id: String(user._id),
    role: user.role as "khati" | "counter",
    name: user.name ?? "",
    phone: user.phone ?? "",
    photoUrl: toPhotoUrl(user.photoUrl) || undefined,
    address: user.address ?? undefined,
    dob: user.dob ? new Date(user.dob as Date).toISOString().slice(0, 10) : undefined,
    kycStatus: (user.kycStatus as KycStatus) ?? "not_submitted",
    registrationToken: user.registrationToken ?? undefined,
    counterId: user.counterId ? String(user.counterId) : undefined,
    completed: user.role === "counter" ? Boolean(user.counterKycCompletedAt) : undefined,
  };
}

export async function submitKhatiProfile(
  token: string,
  data: {
    address: string;
    dob?: string;
    email?: string;
    password?: string;
    photoData?: { buffer: Buffer; contentType: string; ext: string };
  },
): Promise<{ ok: true } | { error: string }> {
  await connectDB();
  const user = await User.findOne({ registrationToken: token, role: { $in: ["khati", "counter"] } });
  if (!user) return { error: "Invalid or expired registration link." };

  // Counters: self-service, same as the old first-login KYC  no admin review.
  // They fill in everything staff normally would (photo, address, DOB, email,
  // password) themselves via this link.
  if (user.role === "counter") {
    if (user.counterKycCompletedAt) return { error: "Registration already submitted." };
    if (!data.dob) return { error: "Date of birth is required." };
    if (!data.email) return { error: "Email is required." };
    if (!data.password || data.password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }
    if (!data.photoData) return { error: "Photo is required." };

    const email = data.email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email, _id: { $ne: user._id } }).select("_id").lean();
    if (existingEmail) return { error: "This email is already in use." };

    try {
      user.photoUrl = await uploadAvatar(String(user._id), data.photoData.buffer, data.photoData.contentType, data.photoData.ext);
    } catch (err) {
      console.error("[kyc] Counter photo upload failed:", err);
      return { error: "Failed to upload photo. Please try again." };
    }

    user.address = data.address.trim();
    user.dob = new Date(data.dob);
    user.email = email;
    user.passwordHash = await hashPassword(data.password);
    user.counterKycCompletedAt = new Date();
    user.registrationToken = undefined;
    await user.save();

    const admin = await User.findOne({ role: "admin" }).select("phone").lean();
    notifyCounterKycToAdmin(admin?.phone, user.name ?? "A counter");

    return { ok: true };
  }

  // Khati: submitted profile goes to admin for approval before the account is active.
  if (user.kycStatus !== "not_submitted") return { error: "Registration already submitted." };
  if (!data.dob) return { error: "Date of birth is required." };

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
      `🆕 *नई कारीगर पंजीकरण | New Karigar Registration*\n\n*${user.name}* (${user.phone}) ने अपना प्रोफाइल जमा कर दिया है और आपकी मंजूरी का इंतज़ार कर रहे हैं।\n*${user.name}* has submitted their profile and is awaiting your approval.\n\nDoorSmith ऐप पर लॉग इन करें और मंजूरी दें।\nLog in to DoorSmith to review and approve.`,
      "kyc",
    ).catch((err) => console.error("[kyc] Admin WA notify failed:", err));
  }

  return { ok: true };
}

// ── Counter first-login KYC (self-service) ──────────────────────────────────

export type CounterKycState = {
  completed: boolean;
  name: string;
  photoUrl?: string;
  address?: string;
};

/** Read a counter's KYC completion state (used to gate the counter area). */
export async function getCounterKycState(userId: string): Promise<CounterKycState> {
  await connectDB();
  const user = await User.findById(userId).select("name role photoUrl address counterKycCompletedAt").lean();
  if (!user || user.role !== "counter") {
    return { completed: false, name: "" };
  }
  // Completed when the explicit flag is set, OR when both photo + address exist.
  // A counter only ever gets those two via this KYC flow, so their presence is a
  // reliable signal — and it's resilient to the flag being missing (e.g. a dev
  // server running a stale Mongoose schema that dropped the new field on save).
  const completed = Boolean(user.counterKycCompletedAt) || Boolean(user.photoUrl && user.address);
  return {
    completed,
    name: user.name ?? "",
    photoUrl: toPhotoUrl(user.photoUrl) || undefined,
    address: user.address ?? undefined,
  };
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
  if (!khati || khati.role !== "khati") throw new Error("Karigar not found.");

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
      `🎉 *बधाई हो, ${khati.name}! | Congratulations, ${khati.name}!*\n\nआपका DoorSmith पंजीकरण स्वीकृत हो गया है! अब आप लॉग इन करके QR स्कैन शुरू कर सकते हैं।\nYour DoorSmith registration has been approved! You can now log in and start scanning QR codes.\n\n🔗 लॉग इन करें | Log in:\nhttps://app.doorsmith.in/login/khati\n\nआपका कारीगर खाता तैयार है! 🚀\nYour karigar account is ready!`,
      "kyc",
    ).catch((err) => console.error("[kyc] Khati approval WA failed:", err));
  }
}

export async function rejectKyc(actorId: string, actorRole: string, khatiId: string, reason: string): Promise<void> {
  await connectDB();
  const khati = await User.findById(khatiId);
  if (!khati || khati.role !== "khati") throw new Error("Karigar not found.");

  if (actorRole !== "admin") throw new Error("Not authorized.");
  const pendingStatuses = ["pending_counter", "pending_sales_rep", "pending_admin"];
  if (!pendingStatuses.includes(khati.kycStatus as string)) throw new Error("Not authorized to reject at this stage.");

  khati.kycStatus = "rejected";
  await khati.save();

  if (khati.phone) {
    waSend(
      khati.phone,
      `❌ *कारीगर पंजीकरण अस्वीकृत | Karigar Registration Rejected*\n\nप्रिय *${khati.name}*, दुर्भाग्यवश आपका DoorSmith पंजीकरण अभी स्वीकृत नहीं हो सका।\nDear *${khati.name}*, unfortunately your DoorSmith registration could not be approved at this time.\n\n*कारण | Reason:*\n${reason || "कोई कारण नहीं दिया गया | No reason provided."}\n\n📞 कृपया सहायता के लिए अपने काउंटर से संपर्क करें।\nPlease contact your counter for further assistance.`,
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
