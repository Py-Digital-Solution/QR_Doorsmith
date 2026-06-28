import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findRedemptionByOtp } from "@/services/redemption";

export const runtime = "nodejs";

/**
 * POST /api/counter/redemptions/lookup  { otp }
 * Counter-only. Resolves the OTP a karigar shows into a pending redemption
 * preview so the counter can confirm and settle it — works regardless of which
 * counter the karigar is registered at.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "counter") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const otp = String(body?.otp ?? "").trim();

  try {
    const redemption = await findRedemptionByOtp(otp);
    return NextResponse.json({ ok: true, redemption });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lookup failed." },
      { status: 400 },
    );
  }
}
