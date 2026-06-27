import "server-only";
import { env } from "@/lib/env";
import { connectDB } from "@/db/mongoose";
import { WaLog } from "@/models/WaLog";
import { getSetting } from "@/services/settings";
import { sendWaFailureAlert } from "@/services/email";

type WaStatus = "disconnected" | "connecting" | "connected";

export type WaStatusResult = {
  status: WaStatus;
  phone: string | null;
};

function base(path: string) {
  const url = env.WA_SERVICE_URL;
  if (!url) throw new Error("WA_SERVICE_URL is not configured.");
  return `${url.replace(/\/$/, "")}${path}`;
}

function headers() {
  return {
    "Content-Type": "application/json",
    ...(env.WA_SERVICE_SECRET
      ? { Authorization: `Bearer ${env.WA_SERVICE_SECRET}` }
      : {}),
  };
}

export async function waStatus(): Promise<WaStatusResult> {
  const res = await fetch(base("/status"), { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error("WhatsApp service unreachable");
  return res.json();
}

export async function waQr(): Promise<string | null> {
  const res = await fetch(base("/qr"), { headers: headers(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch QR");
  const { qr } = await res.json();
  return qr as string;
}

export async function waConnect(): Promise<WaStatusResult> {
  const res = await fetch(base("/connect"), {
    method: "POST",
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to start connection");
  return res.json();
}

export async function waDisconnect(): Promise<void> {
  const res = await fetch(base("/disconnect"), {
    method: "POST",
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to disconnect");
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return phone;
}

export async function waSend(phone: string, message: string, type = "message"): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  let errorMsg: string | undefined;
  try {
    const res = await fetch(base("/send"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ phone: normalizedPhone, message }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to send WhatsApp message");
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    // Log failure to DB then notify admin  non-blocking
    connectDB()
      .then(() =>
        WaLog.create({ phone: normalizedPhone, message, type, status: "failed", error: errorMsg })
      )
      .then(() => getSetting<string>("notification_email", ""))
      .then((raw) => {
        const emails = raw.split(",").map((e) => e.trim()).filter(Boolean);
        return Promise.all(
          emails.map((to) =>
            sendWaFailureAlert({ to, phone: normalizedPhone, type, error: errorMsg!, message }),
          ),
        );
      })
      .catch((e) => console.error("[wa] Failed to log/notify WA failure:", e));
    throw err;
  }

  // Log success  non-blocking
  connectDB()
    .then(() => WaLog.create({ phone: normalizedPhone, message, type, status: "sent" }))
    .catch((e) => console.error("[wa] Failed to log WA success:", e));
}

function logWa(phone: string, message: string, status: "sent" | "failed", error?: string) {
  connectDB()
    .then(() => WaLog.create({ phone, message, type: "otp", status, error }))
    .catch((e) => console.error("[wa] Failed to log OTP WA result:", e));
}

export type WaOtpFailReason = "not_connected" | "not_registered" | "error";
export type WaOtpResult = { ok: true } | { ok: false; reason: WaOtpFailReason };

/**
 * OTP-specific WhatsApp send. Unlike waSend() it does NOT throw  it returns a
 * structured result so the caller can fall back to SMS when WhatsApp can't
 * deliver (service not connected, or the number isn't on WhatsApp). Asks the
 * bridge to verify the number exists first (checkExists).
 */
export async function waSendOtp(phone: string, message: string): Promise<WaOtpResult> {
  const normalizedPhone = normalizePhone(phone);
  try {
    const res = await fetch(base("/send"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ phone: normalizedPhone, message, checkExists: true }),
      cache: "no-store",
    });
    if (res.ok) {
      logWa(normalizedPhone, message, "sent");
      return { ok: true };
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    let reason: WaOtpFailReason = "error";
    if (res.status === 503) reason = "not_connected";
    else if (res.status === 422 || body.code === "not_registered") reason = "not_registered";
    logWa(normalizedPhone, message, "failed", body.error ?? reason);
    return { ok: false, reason };
  } catch (err) {
    logWa(normalizedPhone, message, "failed", err instanceof Error ? err.message : String(err));
    return { ok: false, reason: "error" };
  }
}
