import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { drainNextBatch } from "@/services/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send the next batch of the oldest in-flight broadcast. Called repeatedly by
 * the admin Promotions page while a broadcast is sending, so progress advances
 * as long as the page is open. The cron route is the backstop when it isn't.
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await drainNextBatch();
  return NextResponse.json(result);
}
