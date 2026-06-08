import { NextResponse } from "next/server";
import { requestOtp } from "@/services/otp";

export const runtime = "nodejs";

/**
 * Request an OTP for khati phone login. Exposed as a REST route (not a Server
 * Action) so it works reliably behind Netlify's runtime, matching the
 * client-side sign-in flow used by the login forms.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone ?? "").trim();
    if (!phone) {
      return NextResponse.json({ error: "Enter your phone number." }, { status: 400 });
    }
    await requestOtp(phone);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not send code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
