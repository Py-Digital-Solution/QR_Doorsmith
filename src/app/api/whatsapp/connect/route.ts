import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { waConnect } from "@/services/whatsapp";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await waConnect();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to connect" }, { status: 503 });
  }
}
