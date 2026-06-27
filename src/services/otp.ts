import "server-only";
import { connectDB } from "@/db/mongoose";
import { Otp } from "@/models/Otp";
import { hashPassword, verifyPassword } from "@/lib/password";
import { waSendOtp, type WaOtpFailReason } from "@/services/whatsapp";
import { getSetting, setSetting } from "@/services/settings";
import { sendWaDisconnectedAlert } from "@/services/email";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // min gap between OTP sends per phone
// Don't flood admins with "WhatsApp not connected" emails while WA stays down.
const WA_ALERT_COOLDOWN_MS = 15 * 60 * 1000; // at most one alert per 15 minutes

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpMessage(code: string): string {
  return `🔐 *DoorSmith लॉगिन कोड | Login Code*\n\nआपका लॉगिन कोड है: *${code}*\nYour login code is: *${code}*\n\n5 मिनट में समाप्त होगा। किसी के साथ साझा न करें।\nExpires in 5 minutes. Do not share with anyone.`;
}

export type OtpRequestResult =
  // WhatsApp delivered the code (or one was sent within the cooldown window).
  | { status: "sent" }
  // A code was already sent very recently; do not re-send or fall back.
  | { status: "cooldown"; wait: number }
  // WhatsApp could not deliver  caller should fall back to SMS (Firebase).
  | { status: "wa_unavailable"; reason: WaOtpFailReason };

/**
 * Request a login OTP. WhatsApp is the PRIMARY channel: we only persist the code
 * once WhatsApp confirms delivery. If WhatsApp is unavailable (service not
 * connected, or the number isn't on WhatsApp) we report `wa_unavailable` so the
 * caller can fall back to Firebase SMS.
 */
export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  await connectDB();

  // Throttle: a code was sent within the cooldown window  it's still valid, so
  // proceed to verification rather than re-sending or falling back.
  const existing = await Otp.findOne({ phone });
  if (existing?.updatedAt) {
    const elapsed = Date.now() - new Date(existing.updatedAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return { status: "cooldown", wait: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000) };
    }
  }

  const code = generateCode();

  // Try WhatsApp first. Only store the code if it was actually delivered.
  const wa = await waSendOtp(phone, otpMessage(code));
  if (!wa.ok) {
    // If the WhatsApp bridge itself is down/unreachable, alert admins by email
    // before the caller falls back to Firebase SMS. `not_registered` means
    // WhatsApp works fine but this number isn't on WhatsApp — no alert for that.
    if (wa.reason === "not_connected" || wa.reason === "error") {
      void alertAdminsWaDown(phone, wa.reason);
    }
    return { status: "wa_unavailable", reason: wa.reason };
  }

  const codeHash = await hashPassword(code);
  await Otp.findOneAndUpdate(
    { phone },
    { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0 },
    { upsert: true },
  );
  return { status: "sent" };
}

/**
 * Email the configured admins that WhatsApp is not connected so an OTP fell back
 * to SMS. Throttled via a Settings timestamp so a sustained outage doesn't flood
 * inboxes. Fire-and-forget: never blocks or fails the OTP flow.
 */
async function alertAdminsWaDown(phone: string, reason: WaOtpFailReason): Promise<void> {
  try {
    const last = await getSetting<string>("wa_disconnect_alert_at", "");
    if (last && Date.now() - new Date(last).getTime() < WA_ALERT_COOLDOWN_MS) return;

    const raw = await getSetting<string>("notification_email", "");
    const emails = raw.split(",").map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) return;

    // Record the attempt up front so concurrent requests don't all send.
    await setSetting("wa_disconnect_alert_at", new Date().toISOString());
    await Promise.all(emails.map((to) => sendWaDisconnectedAlert({ to, phone, reason })));
  } catch (e) {
    console.error("[otp] Failed to alert admins about WhatsApp disconnect:", e);
  }
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
