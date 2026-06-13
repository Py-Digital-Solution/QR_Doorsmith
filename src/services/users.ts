import "server-only";
import { connectDB } from "@/db/mongoose";
import { User, type UserRole, type UserStatus } from "@/models/User";
import { hashPassword } from "@/lib/password";
import { canCreate } from "@/lib/rbac";
import { isDuplicateKeyError } from "@/lib/db-errors";
import { isDistributorEnabled } from "@/services/settings";
import {
  DEFAULT_PAGE_SIZE,
  paginated,
  type Pagination,
  type Paginated,
} from "@/lib/pagination";

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

  const base = {
    role: input.role,
    name: input.name.trim(),
    status: "active" as const,
    createdBy: input.actorId,
  };

  if (input.role === "khati") {
    if (!input.phone) throw new Error("Phone is required for a khati.");
    const existing = await User.findOne({ phone: input.phone });
    if (existing) throw new Error("A user with this phone already exists.");
    try {
      return await User.create({ ...base, phone: input.phone.trim() });
    } catch (e) {
      if (isDuplicateKeyError(e)) throw new Error("A user with this phone already exists.");
      throw e;
    }
  }

  if (!input.email || !input.password) {
    throw new Error("Email and password are required for staff accounts.");
  }
  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error("A user with this email already exists.");
  const passwordHash = await hashPassword(input.password);
  const extra: Record<string, unknown> = {};
  if (input.phone) extra.phone = input.phone.trim();
  try {
    return await User.create({ ...base, email, passwordHash, ...extra });
  } catch (e) {
    if (isDuplicateKeyError(e)) throw new Error("A user with this email already exists.");
    throw e;
  }
}

export type UserDTO = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  status: string;
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
    if (input.phone) target.phone = input.phone.trim();
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
    role: d.role as UserRole,
    name: d.name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    status: String(d.status),
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
