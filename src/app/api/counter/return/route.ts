import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processQrReturn } from "@/services/khati";
import { logAudit } from "@/services/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "counter") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const serialNo = String(body?.serialNo ?? "").trim();
  if (!serialNo) {
    return NextResponse.json({ error: "No serial number provided." }, { status: 400 });
  }

  try {
    const result = await processQrReturn(session.user.id, serialNo);
    logAudit({
      actorId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? "",
      action: "return_create", entityType: "qrCode", meta: { serialNo, sku: result.sku, pointsReversed: result.pointsReversed, khatiName: result.khatiName },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Return failed." },
      { status: 400 },
    );
  }
}
