import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { waQr } from "@/services/whatsapp";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const qr = await waQr();
    if (!qr) return NextResponse.json({ qr: null }, { status: 404 });
    return NextResponse.json({ qr });
  } catch {
    return NextResponse.json({ error: "Service unreachable" }, { status: 503 });
  }
}
