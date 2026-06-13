import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { waStatus } from "@/services/whatsapp";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.WA_SERVICE_URL) {
    return NextResponse.json({ status: "disconnected", phone: null, unconfigured: true });
  }

  try {
    const result = await waStatus();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ status: "disconnected", phone: null, unreachable: true });
  }
}
