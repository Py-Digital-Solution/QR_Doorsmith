import "server-only";
import { randomBytes } from "crypto";
import { connectDB } from "@/db/mongoose";
import { User, type UserRole, type UserStatus } from "@/models/User";
import { hashPassword } from "@/lib/password";
import { canCreate } from "@/lib/rbac";
import { isDuplicateKeyError } from "@/lib/db-errors";
import { isDistributorEnabled } from "@/services/settings";
import { Sequence } from "@/models/Sequence";
import { waSend } from "@/services/whatsapp";
import {
  DEFAULT_PAGE_SIZE,
  paginated,
  type Pagination,
  type Paginated,
} from "@/lib/pagination";
import { normalizePhone } from "@/lib/phone";
import { toPhotoUrl } from "@/lib/storage";

const ROLE_PREFIX: Record<string, string> = {
  khati: "KH",
  sales_rep: "SR",
  counter: "CN",
  admin: "AD",
  distributor: "DT",
};

async function nextDisplayId(role: string): Promise<string> {
  const prefix = ROLE_PREFIX[role] ?? "US";
  const seq = await Sequence.findByIdAndUpdate(
    `user_id_${role}`,
    { $inc: { value: 1 } },
    { upsert: true, new: true },
  );
  return `${prefix}-${String(seq!.value).padStart(4, "0")}`;
}

/**
 * An actor may manage a target user if they are an admin, or if they created
 * that user (hierarchy ownership). Used by update/delete.
 */
function canManageTarget(
  actorRole: UserRole,
  actorId: string,
  target: { createdBy?: unknown },
): boolean {
  if (actorRole === "admin") return true;
  return String(target.createdBy ?? "") === actorId;
}

export type CreateUserInput = {
  actorRole: UserRole;
  actorId: string;
  role: UserRole;
  name: string;
  // staff (email + password)
  email?: string;
  password?: string;
  // khati (phone)
  phone?: string;
  // When an admin creates a khati, the admin picks which counter owns them.
  // When a counter creates a khati, this is automatically set to the counter's own ID.
  counterId?: string;
};

/**
 * Create a user, enforcing the SOW 1.2 hierarchy:
 *   admin → sales_rep / distributor, sales_rep|distributor → counter,
 *   counter → khati.
 * Staff get email + password; khatis get a phone (OTP login).
 */
export async function createUser(input: CreateUserInput) {
  await connectDB();

  if (!canCreate(input.actorRole, input.role)) {
    throw new Error(`A ${input.actorRole} cannot create a ${input.role}.`);
  }

  if (input.role === "distributor" && !(await isDistributorEnabled())) {
    throw new Error("The Distributor role is disabled. Enable it in Settings first.");
  }

  const displayId = await nextDisplayId(input.role);

  const base = {
    role: input.role,
    name: input.name.trim(),
    status: "active" as const,
    createdBy: input.actorId,
    displayId,
  };

  if (input.role === "khati") {
    if (!input.phone) throw new Error("Phone is required for a khati.");
    // counterId links this khati to their counter for scan validation.
    // Counter actors own their own khatis; admins/sales_reps/distributors must specify.
    const counterId =
      input.actorRole === "counter" ? input.actorId : input.counterId;
    if (!counterId) throw new Error("Please select which counter this khati belongs to.");
    const phone = normalizePhone(input.phone);
    const existing = await User.findOne({ phone });
    if (existing) throw new Error("A user with this phone already exists.");
    try {
      const registrationToken = randomBytes(24).toString("base64url");
      // Admin-created khatis are active immediately; counter-created khatis
      // stay pending until they complete registration via the WhatsApp link.
      const khatiStatus = input.actorRole === "admin" ? ("active" as const) : ("pending" as const);
      const newKhati = await User.create({ ...base, phone, counterId, registrationToken, status: khatiStatus });
      const { headers } = await import("next/headers");
      const hdrs = await headers();
      const proto = hdrs.get("x-forwarded-proto") ?? "https";
      const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
      const appUrl = `${proto}://${host}`;
      waSend(
        phone,
        `🎉 *DoorSmith में आपका स्वागत है, ${input.name.trim()}! | Welcome to DoorSmith, ${input.name.trim()}!*\n\nआपका खाती खाता बना दिया गया है। नीचे दिए लिंक पर क्लिक करके अपना पंजीकरण पूरा करें  इसमें केवल एक मिनट लगेगा।\nYour khati account has been created. Complete your registration using the link below  it only takes a minute.\n\n${appUrl}/register/${registrationToken}\n\nपंजीकरण के बाद, यहाँ लॉग इन करें: ${appUrl}/khati/login\nAfter registration, log in here: ${appUrl}/khati/login\n\nयह लिंक केवल आपके लिए है। किसी के साथ साझा न करें।\nThis link is unique to you. Do not share it.`,
        "welcome",
      ).catch((err) => console.error("[wa] Welcome message failed:", err));
      return newKhati;
    } catch (e) {
      if (isDuplicateKeyError(e)) throw new Error("A user with this phone already exists.");
      throw e;
    }
  }

  if (!input.email || !input.password) {
    throw new Error("Email and password are required for staff accounts.");
  }
  if (!input.phone) {
    throw new Error("Phone number is required for all users.");
  }
  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error("A user with this email already exists.");
  const passwordHash = await hashPassword(input.password);
  const extra: Record<string, unknown> = {};
  extra.phone = normalizePhone(input.phone);
  try {
    return await User.create({ ...base, email, passwordHash, ...extra });
  } catch (e) {
    if (isDuplicateKeyError(e)) throw new Error("A user with this email already exists.");
    throw e;
  }
}

export type UserDTO = {
  id: string;
  displayId: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  status: string;
  photoUrl?: string;
  kycStatus?: string;
  hasRegistrationToken?: boolean;
};

export type UpdateUserInput = {
  actorRole: UserRole;
  actorId: string;
  id: string;
  name?: string;
  status?: UserStatus;
  email?: string;
  phone?: string;
  password?: string;
};

export async function updateUser(input: UpdateUserInput) {
  await connectDB();
  const target = await User.findById(input.id);
  if (!target) throw new Error("User not found.");
  if (!canManageTarget(input.actorRole, input.actorId, target)) {
    throw new Error("You are not allowed to edit this user.");
  }

  if (input.name !== undefined) target.name = input.name.trim();
  if (input.status) target.status = input.status;

  if (target.role === "khati") {
    if (input.phone) target.phone = normalizePhone(input.phone);
  } else {
    if (input.email) target.email = input.email.trim().toLowerCase();
    if (input.password) target.passwordHash = await hashPassword(input.password);
  }

  await target.save();
}

export async function deleteUser(input: {
  actorRole: UserRole;
  actorId: string;
  id: string;
}) {
  await connectDB();
  if (input.id === input.actorId) {
    throw new Error("You cannot delete your own account.");
  }
  const target = await User.findById(input.id);
  if (!target) throw new Error("User not found.");
  if (target.role === "khati" && input.actorRole !== "admin") {
    throw new Error("Only an admin can delete a khati account.");
  }
  if (!canManageTarget(input.actorRole, input.actorId, target)) {
    throw new Error("You are not allowed to delete this user.");
  }
  await target.deleteOne();
}

export async function listUsers(
  filter: { role?: UserRole; createdBy?: string; search?: string } = {},
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
): Promise<Paginated<UserDTO>> {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (filter.role) query.role = filter.role;
  if (filter.createdBy) query.createdBy = filter.createdBy;
  if (filter.search) query.name = { $regex: filter.search, $options: "i" };

  const { page, pageSize } = pagination;
  const total = await User.countDocuments(query);
  const docs = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const items: UserDTO[] = docs.map((d) => ({
    id: String(d._id),
    displayId: (d as { displayId?: string }).displayId ?? "",
    role: d.role as UserRole,
    name: d.name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    status: String(d.status),
    photoUrl: toPhotoUrl(d.photoUrl) || undefined,
    kycStatus: d.kycStatus ?? undefined,
    hasRegistrationToken: !!d.registrationToken,
  }));

  return paginated(items, total, pagination);
}

/** All counters as {id,label} for select inputs (dispatch). */
export async function listCounters(): Promise<{ id: string; label: string }[]> {
  await connectDB();
  const docs = await User.find({ role: "counter" })
    .sort({ name: 1 })
    .select("name email")
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    label: d.name || d.email || String(d._id),
  }));
}
