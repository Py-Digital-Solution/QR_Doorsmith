import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/db/mongoose";
import { Redemption } from "@/models/Redemption";
import { Settlement } from "@/models/Settlement";
import { User } from "@/models/User";
import { logAudit } from "@/services/audit";

/**
 * Settlement reconciles money between the company and a counter: counters pay
 * out redemption points to karigars, and the admin later "settles up" to
 * reimburse the counter. A redemption counts toward a counter once that counter
 * has APPROVED it (Redemption.processedBy). It is "outstanding" until settled.
 */

export type CounterRedemptionSummary = {
  /** All-time points the counter has approved (settled + outstanding). */
  totalPoints: number;
  totalCount: number;
  /** Already reimbursed by admin. */
  settledPoints: number;
  /** Approved but not yet reimbursed. */
  outstandingPoints: number;
  outstandingCount: number;
};

const EMPTY_SUMMARY: CounterRedemptionSummary = {
  totalPoints: 0,
  totalCount: 0,
  settledPoints: 0,
  outstandingPoints: 0,
  outstandingCount: 0,
};

/** Per-counter redemption totals for a single counter (used on the counter UI). */
export async function getCounterRedemptionSummary(
  counterId: string,
): Promise<CounterRedemptionSummary> {
  await connectDB();
  const rows = await Redemption.aggregate([
    { $match: { processedBy: new mongoose.Types.ObjectId(counterId), status: "approved" } },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: "$points" },
        totalCount: { $sum: 1 },
        settledPoints: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$settledAt", null] }, null] }, 0, "$points"] },
        },
        outstandingPoints: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$settledAt", null] }, null] }, "$points", 0] },
        },
        outstandingCount: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$settledAt", null] }, null] }, 1, 0] },
        },
      },
    },
  ]);
  const r = rows[0];
  if (!r) return { ...EMPTY_SUMMARY };
  return {
    totalPoints: r.totalPoints ?? 0,
    totalCount: r.totalCount ?? 0,
    settledPoints: r.settledPoints ?? 0,
    outstandingPoints: r.outstandingPoints ?? 0,
    outstandingCount: r.outstandingCount ?? 0,
  };
}

export type CounterSettlementRow = {
  counterId: string;
  counterName: string;
  counterPhone: string;
  totalPoints: number;
  settledPoints: number;
  outstandingPoints: number;
  outstandingCount: number;
};

/**
 * One row per counter that has ever approved a redemption, with all-time,
 * settled, and outstanding totals. Used by the admin settle-up page.
 */
export async function listCounterSettlements(): Promise<CounterSettlementRow[]> {
  await connectDB();
  const rows = await Redemption.aggregate([
    { $match: { status: "approved", processedBy: { $ne: null } } },
    {
      $group: {
        _id: "$processedBy",
        totalPoints: { $sum: "$points" },
        settledPoints: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$settledAt", null] }, null] }, 0, "$points"] },
        },
        outstandingPoints: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$settledAt", null] }, null] }, "$points", 0] },
        },
        outstandingCount: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$settledAt", null] }, null] }, 1, 0] },
        },
      },
    },
    { $sort: { outstandingPoints: -1, totalPoints: -1 } },
  ]);

  const ids = rows.map((r) => r._id);
  const users = await User.find({ _id: { $in: ids } }).select("name phone").lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u]));

  return rows.map((r) => {
    const u = nameMap.get(String(r._id));
    return {
      counterId: String(r._id),
      counterName: u?.name || u?.phone || "Unknown counter",
      counterPhone: u?.phone || "",
      totalPoints: r.totalPoints ?? 0,
      settledPoints: r.settledPoints ?? 0,
      outstandingPoints: r.outstandingPoints ?? 0,
      outstandingCount: r.outstandingCount ?? 0,
    };
  });
}

/**
 * Settle ALL of a counter's outstanding (approved, unsettled) redemptions at
 * once. Records a Settlement and stamps each redemption as settled. Returns the
 * total points and count settled.
 */
export async function settleCounter(
  counterId: string,
  adminId: string,
  adminName: string,
  adminRole: string,
  note?: string,
): Promise<{ points: number; count: number }> {
  await connectDB();

  const outstanding = await Redemption.find({
    processedBy: counterId,
    status: "approved",
    settledAt: null,
  })
    .select("_id points")
    .lean();

  if (outstanding.length === 0) {
    throw new Error("This counter has no outstanding redemptions to settle.");
  }

  const points = outstanding.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const ids = outstanding.map((r) => r._id);

  const settlement = await Settlement.create({
    counterId,
    settledBy: adminId,
    points,
    redemptionCount: ids.length,
    note: note?.trim() || "",
  });

  await Redemption.updateMany(
    { _id: { $in: ids } },
    { $set: { settledAt: new Date(), settledBy: adminId, settlementId: settlement._id } },
  );

  logAudit({
    actorId: adminId,
    actorRole: adminRole,
    actorName: adminName,
    action: "counter_settle",
    entityType: "settlement",
    entityId: String(settlement._id),
    meta: { counterId, points, count: ids.length },
  });

  return { points, count: ids.length };
}
