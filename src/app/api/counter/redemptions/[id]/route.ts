import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { approveRedemption, rejectRedemption } from "@/services/redemption";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "counter") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  try {
    if (action === "approve") {
      const otp = String(body?.otp ?? "").trim();
      if (!otp) return NextResponse.json({ error: "OTP is required to approve." }, { status: 400 });
      await approveRedemption(id, session.user.id, otp);
    } else if (action === "reject") {
      await rejectRedemption(id, session.user.id);
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Action failed." },
      { status: 400 },
    );
  }
}
