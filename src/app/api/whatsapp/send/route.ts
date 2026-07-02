import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { waSend } from "@/services/whatsapp";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone, message, checkExists } = await req.json();
  if (!phone || !message) {
    return NextResponse.json({ error: "phone and message required" }, { status: 400 });
  }

  try {
    await waSend(String(phone), String(message), "message", undefined, Boolean(checkExists));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 503 },
    );
  }
}
