import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processQrScan } from "@/services/khati";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "khati") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const serialNo = String(body?.serialNo ?? "").trim();
  if (!serialNo) {
    return NextResponse.json({ error: "No serial number provided." }, { status: 400 });
  }

  try {
    const result = await processQrScan(session.user.id, serialNo);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Scan failed." },
      { status: 400 },
    );
  }
}
