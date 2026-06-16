import "server-only";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { UserRole } from "@/lib/roles";
import { toPhotoUrl } from "@/lib/storage";

export type MyProfile = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  status: string;
  photoUrl: string;
};

export async function getMyProfile(id: string): Promise<MyProfile | null> {
  await connectDB();
  const u = await User.findById(id).lean();
  if (!u) return null;
  return {
    id: String(u._id),
    name: u.name ?? "",
    role: u.role as UserRole,
    email: u.email ?? "",
    phone: u.phone ?? "",
    status: String(u.status),
    photoUrl: toPhotoUrl(u.photoUrl),
  };
}

export async function updateMyName(id: string, name: string) {
  await connectDB();
  const n = name.trim();
  if (!n) throw new Error("Name cannot be empty.");
  const u = await User.findById(id);
  if (!u) throw new Error("User not found.");
  u.name = n;
  await u.save();
}

export async function changeMyPassword(
  id: string,
  current: string,
  next: string,
) {
  await connectDB();
  const u = await User.findById(id);
  if (!u) throw new Error("User not found.");
  if (!u.passwordHash) throw new Error("This account doesn't use a password.");
  if (next.length < 8)
    throw new Error("New password must be at least 8 characters.");
  const ok = await verifyPassword(current, u.passwordHash);
  if (!ok) throw new Error("Current password is incorrect.");
  u.passwordHash = await hashPassword(next);
  await u.save();
}

export async function setMyPhoto(id: string, url: string) {
  await connectDB();
  await User.updateOne({ _id: id }, { $set: { photoUrl: url } });
}
