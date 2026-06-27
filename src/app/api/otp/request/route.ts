import { NextResponse } from "next/server";
import { requestOtp } from "@/services/otp";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

/**
 * Request an OTP for khati phone login. Exposed as a REST route (not a Server
 * Action) so it works reliably behind Netlify's runtime, matching the
 * client-side sign-in flow used by the login forms.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.phone ?? "").trim();
    if (!raw) {
      return NextResponse.json({ error: "Enter your phone number." }, { status: 400 });
    }
    const phone = normalizePhone(raw);
    const result = await requestOtp(phone);

    // WhatsApp delivered (or a code is already in flight within the cooldown):
    // tell the client the OTP went out over WhatsApp  no SMS fallback needed.
    if (result.status === "sent" || result.status === "cooldown") {
      return NextResponse.json({ ok: true, channel: "whatsapp" });
    }

    // WhatsApp unavailable (not connected / number not on WhatsApp / error):
    // signal the client to fall back to Firebase SMS.
    return NextResponse.json({ ok: false, fallback: true, reason: result.reason });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not send code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
