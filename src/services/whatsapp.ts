import "server-only";
import { env } from "@/lib/env";

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

export async function waSend(phone: string, message: string): Promise<void> {
  const res = await fetch(base("/send"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ phone, message }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to send WhatsApp message");
  }
}
