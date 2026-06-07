import "server-only";
import { connectDB } from "@/db/mongoose";
import { Otp } from "@/models/Otp";
import { hashPassword, verifyPassword } from "@/lib/password";
import { env } from "@/lib/env";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // min gap between OTP sends per phone

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Pluggable sender. Phase 1 dev mode logs the code to the server console.
 * Phase 8 swaps this for Firebase SMS / WhatsApp Cloud API.
 */
async function sendOtp(phone: string, code: string): Promise<void> {
  if (env.OTP_DEV_MODE) {
    console.log(`\n[OTP][dev] ${phone} → ${code}  (not actually sent)\n`);
    return;
  }
  throw new Error(
    "OTP delivery not configured. Set OTP_DEV_MODE=true for development.",
  );
}

export async function requestOtp(phone: string): Promise<void> {
  await connectDB();

  // Throttle: block rapid re-sends to the same phone (SMS cost + abuse).
  const existing = await Otp.findOne({ phone });
  if (existing?.updatedAt) {
    const elapsed = Date.now() - new Date(existing.updatedAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new Error(`Please wait ${wait}s before requesting another code.`);
    }
  }

  const code = generateCode();
  const codeHash = await hashPassword(code);
  await Otp.findOneAndUpdate(
    { phone },
    { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0 },
    { upsert: true },
  );
  await sendOtp(phone, code);
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  await connectDB();
  const otp = await Otp.findOne({ phone });
  if (!otp) return false;

  if (otp.expiresAt.getTime() < Date.now() || otp.attempts >= MAX_ATTEMPTS) {
    await otp.deleteOne();
    return false;
  }

  const ok = await verifyPassword(code, otp.codeHash);
  if (!ok) {
    otp.attempts += 1;
    await otp.save();
    return false;
  }

  await otp.deleteOne();
  return true;
}
