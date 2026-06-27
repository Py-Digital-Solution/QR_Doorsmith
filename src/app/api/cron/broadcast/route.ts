import { NextResponse } from "next/server";
import { drainNextBatch } from "@/services/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How many batches to send per cron tick. Kept small to stay within serverless
// time limits; the schedule frequency controls overall throughput.
const MAX_BATCHES = 5;

/**
 * Backstop drainer for queued broadcasts — keeps sending even when no admin has
 * the Promotions page open. Protected by CRON_SECRET like the nightly summary.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let batches = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const r = await drainNextBatch();
    if (!r.active) break;
    batches++;
  }

  return NextResponse.json({ ok: true, batches });
}
