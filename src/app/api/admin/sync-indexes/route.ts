import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/db/mongoose";
import * as models from "@/models";
import mongoose from "mongoose";

export const runtime = "nodejs";

/**
 * POST /api/admin/sync-indexes
 * Sync all MongoDB indexes. Admin only.
 * Can be called from dashboard or via curl:
 * curl -X POST https://app.doorsmith.in/api/admin/sync-indexes \
 *   -H "Authorization: Bearer {ADMIN_TOKEN}"
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectDB();

    const results: Record<string, boolean> = {};
    for (const [name, value] of Object.entries(models)) {
      const model = value as mongoose.Model<unknown>;
      if (model?.syncIndexes) {
        try {
          await model.syncIndexes();
          results[name] = true;
        } catch (err) {
          console.error(`Failed to sync indexes for ${name}:`, err);
          results[name] = false;
        }
      }
    }

    await mongoose.disconnect();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("Index sync failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
