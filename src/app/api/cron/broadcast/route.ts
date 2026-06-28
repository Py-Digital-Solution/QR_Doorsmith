import { NextResponse } from "next/server";
import { drainNextBatch } from "@/services/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow the daily backstop to run long enough to clear a real backlog.
export const maxDuration = 60;

// Stop draining a few seconds before the function time limit so the request
// returns cleanly instead of being killed mid-batch. Runs daily (Hobby plan
// only permits once-per-day crons), so it must drain as much as it safely can.
const TIME_BUDGET_MS = 50_000;

/**
 * Backstop drainer for queued broadcasts — keeps sending even when no admin has
 * the Promotions page open. The Promotions page drains in real time while open;
 * this daily job clears anything left over. Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  let batches = 0;
  while (Date.now() - start < TIME_BUDGET_MS) {
    const r = await drainNextBatch();
    if (!r.active) break;
    batches++;
  }

  return NextResponse.json({ ok: true, batches });
}
