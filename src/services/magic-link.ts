import "server-only";
import crypto from "crypto";
import { connectDB } from "@/db/mongoose";
import { User, type UserDoc } from "@/models/User";
import { MagicToken } from "@/models/MagicToken";
import { sendMagicLoginNotification } from "@/services/wa-notify";

const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Generate a 7-day magic login link for any user role and send it to their phone (WhatsApp) and email.
 */
export async function createAndSendMagicLink(userId: string): Promise<{ success: boolean; magicUrl: string }> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found.");

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Invalidate previous tokens for this user
  await MagicToken.deleteMany({ userId: user._id });

  await MagicToken.create({
    userId: user._id,
    token,
    expiresAt,
    used: false,
  });

  const magicUrl = `${APP_URL}/login/magic?token=${token}`;

  // Dispatch to phone and/or email
  await sendMagicLoginNotification({
    phone: user.phone,
    email: user.email,
    name: user.name,
    role: user.role,
    magicUrl,
  });

  return { success: true, magicUrl };
}

import { Types } from "mongoose";

/**
 * Verify a magic login token and return the active UserDoc.
 */
export async function verifyMagicToken(token: string): Promise<(UserDoc & { _id: Types.ObjectId }) | null> {
  await connectDB();
  const record = await MagicToken.findOne({
    token,
    expiresAt: { $gt: new Date() },
    used: false,
  });

  if (!record) return null;

  const user = await User.findById(record.userId);
  if (!user || user.status !== "active") return null;

  // Mark token as used
  record.used = true;
  await record.save();

  return user;
}
