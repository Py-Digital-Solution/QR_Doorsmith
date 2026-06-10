import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestRedemption } from "@/services/redemption";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "khati") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const points = Number(body?.points ?? 0);
  if (!Number.isInteger(points) || points < 1) {
    return NextResponse.json({ error: "Enter a valid points amount." }, { status: 400 });
  }

  try {
    const result = await requestRedemption(session.user.id, points);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed." },
      { status: 400 },
    );
  }
}
