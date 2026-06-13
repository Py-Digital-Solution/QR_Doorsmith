import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { waDisconnect } from "@/services/whatsapp";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await waDisconnect();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 503 });
  }
}
