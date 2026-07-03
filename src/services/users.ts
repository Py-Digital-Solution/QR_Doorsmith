import "server-only";
import { randomBytes } from "crypto";
import { connectDB } from "@/db/mongoose";
import { User, type UserRole, type UserStatus } from "@/models/User";
import { hashPassword } from "@/lib/password";
import { canCreate } from "@/lib/rbac";
import { isDuplicateKeyError, duplicateKeyField } from "@/lib/db-errors";
import { isDistributorEnabled } from "@/services/settings";
import { Sequence } from "@/models/Sequence";
import { QrCode } from "@/models/QrCode";
import { waSend } from "@/services/whatsapp";
import { notifyStaffWelcome, notifyKarigarLinked, notifyAccountStatus } from "@/services/wa-notify";
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
    if (!input.phone) throw new Error("Phone is required for a karigar.");
    // counterId links this khati to their counter for scan validation.
    // Counter actors own their own khatis; admins/sales_reps/distributors must specify.
    const counterId =
      input.actorRole === "counter" ? input.actorId : input.counterId;
    if (!counterId) throw new Error("Please select which counter this karigar belongs to.");
    const phone = normalizePhone(input.phone);

    // A person can be linked to multiple counters (single shared points wallet).
    // If this phone already belongs to a karigar, link them to this counter
    // instead of erroring. Only admins and counters reach here (canCreate), which
    // matches who is allowed to link. Non-karigar phones still conflict.
    const existing = await User.findOne({ phone });
    if (existing) {
      if (existing.role !== "khati") {
        throw new Error("A user with this phone already exists.");
      }
      const linkedTo = (existing.counterIds ?? []).map(String);
      const alreadyHere =
        String(existing.counterId ?? "") === String(counterId) || linkedTo.includes(String(counterId));
      if (alreadyHere) {
        throw new Error("This karigar is already registered at this counter.");
      }
      // Seed counterIds with the primary counterId too, so membership is complete.
      const toAdd = [existing.counterId, counterId].filter(Boolean) as unknown[];
      await User.updateOne({ _id: existing._id }, { $addToSet: { counterIds: { $each: toAdd } } });
      const counterDoc = await User.findById(counterId).select("name").lean();
      notifyKarigarLinked(existing.phone, existing.name, counterDoc?.name ?? "a new counter");
      return existing;
    }

    try {
      const registrationToken = randomBytes(24).toString("base64url");
      // Admin-created khatis are active immediately; counter-created khatis
      // stay pending until they complete registration via the WhatsApp link.
      const khatiStatus = input.actorRole === "admin" ? ("active" as const) : ("pending" as const);
      const newKhati = await User.create({ ...base, phone, counterId, counterIds: [counterId], registrationToken, status: khatiStatus });
      const appUrl = await currentAppUrl();
      waSend(
        phone,
        `🎉 *DoorSmith में आपका स्वागत है, ${input.name.trim()}! | Welcome to DoorSmith, ${input.name.trim()}!*\n\nआपका कारीगर खाता बना दिया गया है। नीचे दिए लिंक पर क्लिक करके अपना पंजीकरण पूरा करें  इसमें केवल एक मिनट लगेगा।\nYour karigar account has been created. Complete your registration using the link below  it only takes a minute.\n\n${appUrl}/register/${registrationToken}\n\nपंजीकरण के बाद, यहाँ लॉग इन करें: ${appUrl}/khati/login\nAfter registration, log in here: ${appUrl}/khati/login\n\nयह लिंक केवल आपके लिए है। किसी के साथ साझा न करें।\nThis link is unique to you. Do not share it.`,
        "welcome",
      ).catch((err) => console.error("[wa] Welcome message failed:", err));
      return newKhati;
    } catch (e) {
      if (isDuplicateKeyError(e)) throw new Error("A user with this phone already exists.");
      throw e;
    }
  }

  if (input.role === "counter") {
    // Counters onboard exactly like a khati: just name + phone here. Everything
    // else (photo, address, DOB, email, password) is filled in by the counter
    // themselves via the WhatsApp registration link.
    if (!input.phone) throw new Error("Phone is required for a counter.");
    const phone = normalizePhone(input.phone);

    if (await User.findOne({ phone })) {
      throw new Error("A user with this phone number already exists.");
    }

    try {
      const registrationToken = randomBytes(24).toString("base64url");
      const newCounter = await User.create({ ...base, phone, registrationToken });
      const appUrl = await currentAppUrl();
      waSend(
        phone,
        `🎉 *DoorSmith में आपका स्वागत है, ${input.name.trim()}! | Welcome to DoorSmith, ${input.name.trim()}!*\n\nआपका काउंटर खाता बना दिया गया है। नीचे दिए लिंक पर क्लिक करके अपना पंजीकरण पूरा करें  इसमें केवल एक मिनट लगेगा।\nYour counter account has been created. Complete your registration using the link below  it only takes a minute.\n\n${appUrl}/register/${registrationToken}\n\nपंजीकरण के बाद, यहाँ लॉग इन करें: ${appUrl}/login\nAfter registration, log in here: ${appUrl}/login\n\nयह लिंक केवल आपके लिए है। किसी के साथ साझा न करें।\nThis link is unique to you. Do not share it.`,
        "welcome",
      ).catch((err) => console.error("[wa] Counter welcome message failed:", err));
      return newCounter;
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
  const phone = normalizePhone(input.phone);

  // Pre-check both unique fields so the message names the actual clash, instead
  // of relying on the DB error (which can't tell email from phone after insert).
  if (await User.findOne({ email })) {
    throw new Error("A user with this email already exists.");
  }
  if (await User.findOne({ phone })) {
    throw new Error("A user with this phone number already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  try {
    const created = await User.create({ ...base, email, passwordHash, phone });
    notifyStaffWelcome(phone, base.name, input.role, email);
    return created;
  } catch (e) {
    // Safety net for a race between the pre-check and insert: name the field.
    const field = duplicateKeyField(e);
    if (field === "phone") throw new Error("A user with this phone number already exists.");
    if (field === "email") throw new Error("A user with this email already exists.");
    if (isDuplicateKeyError(e)) throw new Error("A user with these details already exists.");
    throw e;
  }
}

/** Best-effort app base URL from the current request headers  used to build links in WA messages. */
async function currentAppUrl(): Promise<string> {
  const { headers } = await import("next/headers");
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
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
  address?: string;
  kycStatus?: string;
  hasRegistrationToken?: boolean;
  /** Global karigar rank by lifetime points (1 = highest). Only set for khatis. */
  rank?: number;
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

  const prevStatus = target.status;
  if (input.name !== undefined) target.name = input.name.trim();
  if (input.status) target.status = input.status;

  if (target.role === "khati") {
    if (input.phone) target.phone = normalizePhone(input.phone);
  } else {
    if (input.email) target.email = input.email.trim().toLowerCase();
    if (input.password) target.passwordHash = await hashPassword(input.password);
  }

  await target.save();

  // Tell the user when their account is suspended or reactivated.
  if (input.status && input.status !== prevStatus) {
    notifyAccountStatus(target.phone, target.name, input.status);
  }
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
    throw new Error("Only an admin can delete a karigar account.");
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

  // Global karigar rank by lifetime points (1 = highest). Built once from a
  // sorted list of all khati scores, then looked up per khati on this page.
  let rankOf: ((pts: number) => number) | null = null;
  if (docs.some((d) => d.role === "khati")) {
    const scores = (await User.find({ role: "khati" }).select("lifetimePoints").lean())
      .map((u) => (u as { lifetimePoints?: number }).lifetimePoints ?? 0)
      .sort((a, b) => b - a);
    rankOf = (pts: number) => {
      // Binary search for the count of strictly-higher scores (ties share a rank).
      let lo = 0;
      let hi = scores.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (scores[mid] > pts) lo = mid + 1;
        else hi = mid;
      }
      return lo + 1;
    };
  }

  // Global counter rank by sales = products scanned at the counter (net of
  // returns, since returned codes go back to "active"). 1 = highest.
  let counterRankOf: ((counterId: string) => number) | null = null;
  if (docs.some((d) => d.role === "counter")) {
    const agg = await QrCode.aggregate<{ _id: unknown; sales: number }>([
      { $match: { status: "scanned", counterId: { $ne: null } } },
      { $group: { _id: "$counterId", sales: { $sum: 1 } } },
    ]);
    const salesMap = new Map<string, number>(agg.map((a) => [String(a._id), a.sales]));
    const totalCounters = await User.countDocuments({ role: "counter" });
    const cScores = [...salesMap.values()];
    // Counters with zero scans aren't in the aggregation — pad zeros so they rank.
    for (let i = cScores.length; i < totalCounters; i++) cScores.push(0);
    cScores.sort((a, b) => b - a);
    counterRankOf = (counterId: string) => {
      const s = salesMap.get(counterId) ?? 0;
      let lo = 0;
      let hi = cScores.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cScores[mid] > s) lo = mid + 1;
        else hi = mid;
      }
      return lo + 1;
    };
  }

  const items: UserDTO[] = docs.map((d) => ({
    id: String(d._id),
    displayId: (d as { displayId?: string }).displayId ?? "",
    role: d.role as UserRole,
    name: d.name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    status: String(d.status),
    photoUrl: toPhotoUrl(d.photoUrl) || undefined,
    address: d.address ?? undefined,
    kycStatus: d.kycStatus ?? undefined,
    hasRegistrationToken: !!d.registrationToken,
    rank:
      d.role === "khati"
        ? rankOf?.((d as { lifetimePoints?: number }).lifetimePoints ?? 0)
        : d.role === "counter"
          ? counterRankOf?.(String(d._id))
          : undefined,
  }));

  return paginated(items, total, pagination);
}

export type CounterKhatiRow = UserDTO & { totalPoints: number; rank: number };

/**
 * Khatis registered at a counter, each annotated with their total (lifetime)
 * points and rank within that counter's khatis (1 = highest). Sorted by points
 * desc so the ranking reads top-down.
 */
export async function listCounterKhatis(
  counterId: string,
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  search?: string,
): Promise<Paginated<CounterKhatiRow>> {
  await connectDB();

  // Membership: a counter's khatis are those it created OR was linked to (a
  // karigar can belong to multiple counters).
  const membership = { $or: [{ createdBy: counterId }, { counterIds: counterId }] };

  // Rank map across ALL of this counter's khatis (independent of search/paging).
  const ranked = await User.find({ role: "khati", ...membership })
    .select("_id lifetimePoints")
    .sort({ lifetimePoints: -1 })
    .lean();
  const rankMap = new Map<string, number>();
  ranked.forEach((u, i) => rankMap.set(String(u._id), i + 1));

  const query: Record<string, unknown> = { role: "khati", ...membership };
  if (search) query.name = { $regex: search, $options: "i" };

  const { page, pageSize } = pagination;
  const total = await User.countDocuments(query);
  const docs = await User.find(query)
    .sort({ lifetimePoints: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const items: CounterKhatiRow[] = docs.map((d) => ({
    id: String(d._id),
    displayId: (d as { displayId?: string }).displayId ?? "",
    role: d.role as UserRole,
    name: d.name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    status: String(d.status),
    photoUrl: toPhotoUrl(d.photoUrl) || undefined,
    address: d.address ?? undefined,
    kycStatus: d.kycStatus ?? undefined,
    hasRegistrationToken: !!d.registrationToken,
    totalPoints: (d as { lifetimePoints?: number }).lifetimePoints ?? 0,
    rank: rankMap.get(String(d._id)) ?? 0,
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
