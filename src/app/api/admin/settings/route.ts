import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setSetting } from "@/services/settings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { key, value } = body as { key?: string; value?: unknown };
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const ALLOWED_KEYS = ["min_redemption_points"];
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Unknown setting key." }, { status: 400 });
  }

  try {
    await setSetting(key, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed." },
      { status: 500 },
    );
  }
}
