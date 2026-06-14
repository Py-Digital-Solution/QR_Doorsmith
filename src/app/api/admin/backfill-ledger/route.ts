import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/db/mongoose";
import { QrCode } from "@/models/QrCode";
import { Return } from "@/models/Return";
import { Redemption } from "@/models/Redemption";
import { PointTransaction } from "@/models/PointTransaction";
import { User } from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time backfill — creates PointTransaction entries for all historical
 * QR scans, returns, and approved redemptions that pre-date the ledger.
 * Safe to call multiple times: skips any event already recorded
 * (checked by qrCodeId / returnId / redemptionId uniqueness).
 * Admin-only.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Optional ?dry=true to preview counts without writing
  const dry = new URL(req.url).searchParams.get("dry") === "true";

  await connectDB();

  // ── 1. Find existing ledger IDs so we don't double-write ────────────────
  const [existingQrIds, existingReturnIds, existingRedemptionIds] = await Promise.all([
    PointTransaction.distinct("qrCodeId", { qrCodeId: { $ne: null } }),
    PointTransaction.distinct("returnId", { returnId: { $ne: null } }),
    PointTransaction.distinct("redemptionId", { redemptionId: { $ne: null } }),
  ]);
  const existingQrSet = new Set(existingQrIds.map(String));
  const existingReturnSet = new Set(existingReturnIds.map(String));
  const existingRedemptionSet = new Set(existingRedemptionIds.map(String));

  // ── 2. Load all khatis for running-balance tracking ─────────────────────
  const khatis = await User.find({ role: "khati" }).select("_id").lean();
  const khatiIds = khatis.map((k) => k._id);

  let scansWritten = 0;
  let returnsWritten = 0;
  let redemptionsWritten = 0;

  // Process per-khati so we can maintain an accurate running balance
  for (const khati of khatiIds) {
    const khatiIdStr = String(khati);

    // Collect all events for this khati sorted by their timestamp
    const [scannedCodes, returns, redemptions] = await Promise.all([
      QrCode.find({
        scannedByKhatiId: khati,
        status: { $in: ["scanned", "active"] }, // active = returned but scan still counts
        scannedAt: { $ne: null },
      }).select("_id type serialNo sku rewardPoints scannedAt parentQrId").lean(),
      Return.find({ khatiId: khati })
        .select("_id serialNo sku pointsReversed createdAt")
        .lean(),
      Redemption.find({ khatiId: khati, status: "approved" })
        .select("_id points createdAt")
        .lean(),
    ]);

    // For small-box scans: the box itself earns 0 points (children earn).
    // We record the box scan as the event, summing child rewardPoints.
    const smallBoxIds = scannedCodes
      .filter((c) => c.type === "small")
      .map((c) => c._id);

    let childTotals = new Map<string, number>();
    if (smallBoxIds.length > 0) {
      const children = await QrCode.find({
        parentQrId: { $in: smallBoxIds },
        scannedByKhatiId: khati,
        type: "product",
      }).select("parentQrId rewardPoints").lean();
      for (const ch of children) {
        const key = String(ch.parentQrId);
        childTotals.set(key, (childTotals.get(key) ?? 0) + (ch.rewardPoints ?? 0));
      }
    }

    // Exclude child products that belong to a scanned small box (box row covers them)
    const scannedBoxIdSet = new Set(smallBoxIds.map(String));
    const filteredScans = scannedCodes.filter(
      (c) => !(c.type === "product" && c.parentQrId && scannedBoxIdSet.has(String(c.parentQrId))),
    );

    // Build a unified timeline of events
    type Event =
      | { kind: "scan"; at: Date; doc: typeof filteredScans[0] }
      | { kind: "return"; at: Date; doc: typeof returns[0] }
      | { kind: "redemption"; at: Date; doc: typeof redemptions[0] };

    const events: Event[] = [
      ...filteredScans.map((d) => ({ kind: "scan" as const, at: d.scannedAt as Date, doc: d })),
      ...returns.map((d) => ({ kind: "return" as const, at: d.createdAt as Date, doc: d })),
      ...redemptions.map((d) => ({ kind: "redemption" as const, at: d.createdAt as Date, doc: d })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    let runningBalance = 0;
    const toInsert: Record<string, unknown>[] = [];

    for (const ev of events) {
      if (ev.kind === "scan") {
        const d = ev.doc;
        if (existingQrSet.has(String(d._id))) {
          // Already recorded — still need to advance running balance
          const pts = d.type === "small"
            ? (childTotals.get(String(d._id)) ?? 0)
            : (d.rewardPoints ?? 0);
          runningBalance += pts;
          continue;
        }
        const pts = d.type === "small"
          ? (childTotals.get(String(d._id)) ?? 0)
          : (d.rewardPoints ?? 0);
        if (pts === 0) continue;
        runningBalance += pts;
        toInsert.push({
          khatiId: khati,
          qrCodeId: d._id,
          type: d.type === "small" ? "scan_small_box" : "scan_product",
          points: pts,
          balanceAfter: runningBalance,
          description: d.type === "small" ? "Small box scan (backfill)" : "Product scan (backfill)",
          sku: d.sku ?? "",
          serialNo: d.serialNo ?? "",
          createdAt: ev.at,
          updatedAt: ev.at,
        });
        scansWritten++;
      } else if (ev.kind === "return") {
        const d = ev.doc;
        if (existingReturnSet.has(String(d._id))) {
          runningBalance -= d.pointsReversed;
          continue;
        }
        runningBalance -= d.pointsReversed;
        toInsert.push({
          khatiId: khati,
          returnId: d._id,
          type: "return_reversal",
          points: -d.pointsReversed,
          balanceAfter: runningBalance,
          description: "Return reversal (backfill)",
          sku: d.sku ?? "",
          serialNo: d.serialNo ?? "",
          createdAt: ev.at,
          updatedAt: ev.at,
        });
        returnsWritten++;
      } else {
        const d = ev.doc;
        if (existingRedemptionSet.has(String(d._id))) {
          runningBalance -= d.points;
          continue;
        }
        runningBalance -= d.points;
        toInsert.push({
          khatiId: khati,
          redemptionId: d._id,
          type: "redemption_lock",
          points: -d.points,
          balanceAfter: runningBalance,
          description: "Points redeemed (backfill)",
          createdAt: ev.at,
          updatedAt: ev.at,
        });
        redemptionsWritten++;
      }
    }

    if (!dry && toInsert.length > 0) {
      await PointTransaction.insertMany(toInsert, { timestamps: false });
    }
  }

  return NextResponse.json({
    ok: true,
    dry,
    scansWritten,
    returnsWritten,
    redemptionsWritten,
    total: scansWritten + returnsWritten + redemptionsWritten,
  });
}
