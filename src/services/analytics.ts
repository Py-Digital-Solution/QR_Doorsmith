import "server-only";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { QrCode } from "@/models/QrCode";
import { Return } from "@/models/Return";
import { Redemption } from "@/models/Redemption";
import { PointTransaction } from "@/models/PointTransaction";
import { Types } from "mongoose";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
const oid = (id: string) => new Types.ObjectId(id);

/** Sum of earned points (positive entries) for a set of khatis since a date. */
async function sumEarned(khatiIds: Types.ObjectId[], since?: Date): Promise<number> {
  const match: Record<string, unknown> = { khatiId: { $in: khatiIds }, points: { $gt: 0 } };
  if (since) match.createdAt = { $gte: since };
  const r = await PointTransaction.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$points" } } },
  ]);
  return r[0]?.total ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// KHATI
// ─────────────────────────────────────────────────────────────────────────────
export type KhatiDashboard = {
  points: number;
  lifetimePoints: number;
  scansToday: number;
  scansWeek: number;
  scansTotal: number;
  earnedWeek: number;
  earnedMonth: number;
  redeemedTotal: number;
  redemptionsPending: number;
  returnsTotal: number;
  pointsReversed: number;
  rank: number | null;
};

export async function getKhatiDashboard(khatiId: string): Promise<KhatiDashboard> {
  await connectDB();
  const today = startOfToday();
  const week = daysAgo(7);
  const month = daysAgo(30);
  const _id = oid(khatiId);

  const [
    user,
    scansToday,
    scansWeek,
    scansTotal,
    earnedWeek,
    earnedMonth,
    redeemAgg,
    redemptionsPending,
    returnsTotal,
    reversedAgg,
  ] = await Promise.all([
    User.findById(khatiId).select("points lifetimePoints").lean(),
    QrCode.countDocuments({ scannedByKhatiId: khatiId, scannedAt: { $gte: today } }),
    QrCode.countDocuments({ scannedByKhatiId: khatiId, scannedAt: { $gte: week } }),
    QrCode.countDocuments({ scannedByKhatiId: khatiId, status: "scanned" }),
    sumEarned([_id], week),
    sumEarned([_id], month),
    Redemption.aggregate([
      { $match: { khatiId: _id, status: "approved" } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]),
    Redemption.countDocuments({ khatiId: _id, status: "pending" }),
    Return.countDocuments({ khatiId: _id }),
    Return.aggregate([
      { $match: { khatiId: _id } },
      { $group: { _id: null, total: { $sum: "$pointsReversed" } } },
    ]),
  ]);

  // Rank by lifetime points using aggregation (more efficient than countDocuments)
  const lifetime = user?.lifetimePoints ?? 0;
  const rankAgg = lifetime > 0
    ? await User.aggregate([
        { $match: { role: "khati", status: "active", lifetimePoints: { $gt: lifetime } } },
        { $count: "total" },
      ])
    : [];
  const rankAbove = rankAgg[0]?.total ?? 0;

  return {
    points: user?.points ?? 0,
    lifetimePoints: lifetime,
    scansToday,
    scansWeek,
    scansTotal,
    earnedWeek,
    earnedMonth,
    redeemedTotal: redeemAgg[0]?.total ?? 0,
    redemptionsPending,
    returnsTotal,
    pointsReversed: reversedAgg[0]?.total ?? 0,
    rank: rankAbove === null ? null : rankAbove + 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTER
// ─────────────────────────────────────────────────────────────────────────────
export type RecentTx = {
  id: string;
  khatiName: string;
  type: string;
  points: number;
  balanceAfter: number;
  serialNo: string;
  createdAt: Date;
};

export type RecentKhati = {
  id: string;
  name: string;
  status: string;
  kycStatus?: string;
  createdAt: Date;
};

export type CounterDashboard = {
  khatiTotal: number;
  khatiActive: number;
  khatiPending: number;
  scansToday: number;
  scansWeek: number;
  scansMonth: number;
  pointsDistributed: number;
  pointsToday: number;
  redemptionsPending: number;
  redemptionsApproved: number;
  redemptionsRejected: number;
  pointsRedeemed: number;
  returnsTotal: number;
  returnsWeek: number;
  returnsToday: number;
  inventoryActive: number;
  topKhatis: { name: string; points: number }[];
  recentTransactions: RecentTx[];
  recentKhatis: RecentKhati[];
};

export async function getCounterDashboard(counterId: string): Promise<CounterDashboard> {
  await connectDB();
  const today = startOfToday();
  const week = daysAgo(7);
  const month = daysAgo(30);
  const _id = oid(counterId);

  const khatis = await User.find({ role: "khati", createdBy: counterId })
    .select("_id status kycStatus name points createdAt")
    .lean();
  const khatiIds = khatis.map((k) => k._id as Types.ObjectId);

  const [
    scansToday,
    scansWeek,
    scansMonth,
    pointsDistributed,
    pointsToday,
    redemptionsPending,
    redemptionsApproved,
    redemptionsRejected,
    redeemedAgg,
    returnsToday,
    returnsTotal,
    returnsWeek,
    inventoryActive,
    recentTxDocs,
  ] = await Promise.all([
    QrCode.countDocuments({ counterId: _id, status: "scanned", scannedAt: { $gte: today } }),
    QrCode.countDocuments({ counterId: _id, status: "scanned", scannedAt: { $gte: week } }),
    QrCode.countDocuments({ counterId: _id, status: "scanned", scannedAt: { $gte: month } }),
    sumEarned(khatiIds),
    sumEarned(khatiIds, today),
    Redemption.countDocuments({ counterId: _id, status: "pending" }),
    Redemption.countDocuments({ counterId: _id, status: "approved" }),
    Redemption.countDocuments({ counterId: _id, status: "rejected" }),
    Redemption.aggregate([
      { $match: { counterId: _id, status: "approved" } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]),
    Return.countDocuments({ counterId: _id, createdAt: { $gte: today } }),
    Return.countDocuments({ counterId: _id }),
    Return.countDocuments({ counterId: _id, createdAt: { $gte: week } }),
    QrCode.countDocuments({ counterId: _id, status: "active" }),
    khatiIds.length > 0
      ? PointTransaction.find({ khatiId: { $in: khatiIds } })
          .sort({ createdAt: -1 })
          .limit(8)
          .select("khatiId type points balanceAfter serialNo createdAt")
          .lean()
      : Promise.resolve([]),
  ]);

  // Resolve khati names for transactions
  const khatiNameMap = new Map(khatis.map((k) => [String(k._id), k.name ?? "—"]));

  const topKhatis = [...khatis]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 5)
    .map((k) => ({ name: k.name || "—", points: k.points ?? 0 }));

  const recentKhatis = [...khatis]
    .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
    .slice(0, 6)
    .map((k) => ({
      id: String(k._id),
      name: k.name ?? "—",
      status: k.status,
      kycStatus: k.kycStatus ?? undefined,
      createdAt: k.createdAt as Date,
    }));

  const recentTransactions = (recentTxDocs as Array<{
    _id: unknown; khatiId: unknown; type: string;
    points: number; balanceAfter: number; serialNo?: string; createdAt: Date;
  }>).map((t) => ({
    id: String(t._id),
    khatiName: khatiNameMap.get(String(t.khatiId)) ?? "—",
    type: t.type,
    points: t.points,
    balanceAfter: t.balanceAfter,
    serialNo: t.serialNo ?? "",
    createdAt: t.createdAt,
  }));

  return {
    khatiTotal: khatis.length,
    khatiActive: khatis.filter((k) => k.status === "active").length,
    khatiPending: khatis.filter((k) => k.kycStatus && k.kycStatus !== "approved" && k.kycStatus !== "rejected").length,
    scansToday,
    scansWeek,
    scansMonth,
    pointsDistributed,
    pointsToday,
    redemptionsPending,
    redemptionsApproved,
    redemptionsRejected,
    pointsRedeemed: redeemedAgg[0]?.total ?? 0,
    returnsToday,
    returnsTotal,
    returnsWeek,
    inventoryActive,
    topKhatis,
    recentTransactions,
    recentKhatis,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES REP / DISTRIBUTOR
// ─────────────────────────────────────────────────────────────────────────────
export type SalesDashboard = {
  counterTotal: number;
  khatiTotal: number;
  khatiActive: number;
  khatiPending: number;
  scansToday: number;
  scansWeek: number;
  scansMonth: number;
  pointsDistributed: number;
  pointsToday: number;
  pendingApprovals: number;
  pendingRedemptions: number;
  redemptionsApproved: number;
  redemptionsRejected: number;
  returnsToday: number;
  returnsWeek: number;
  topCounters: { name: string; scans: number; khatis: number; points: number }[];
  topKhatis: { name: string; points: number; counter: string }[];
  recentTransactions: RecentTx[];
  recentRegistrations: { id: string; name: string; role: string; status: string; kycStatus?: string; createdAt: Date }[];
};

export async function getSalesDashboard(salesId: string): Promise<SalesDashboard> {
  await connectDB();
  const today = startOfToday();
  const week = daysAgo(7);
  const month = daysAgo(30);

  const counters = await User.find({ role: "counter", createdBy: salesId })
    .select("_id name createdAt")
    .lean();
  const counterIds = counters.map((c) => c._id as Types.ObjectId);
  const counterIdStrs = counterIds.map((c) => String(c));

  const khatis = await User.find({ role: "khati", createdBy: { $in: counterIdStrs } })
    .select("_id status createdBy kycStatus name points createdAt")
    .lean();
  const khatiIds = khatis.map((k) => k._id as Types.ObjectId);

  const [
    scansToday, scansWeek, scansMonth,
    pointsDistributed, pointsToday,
    pendingRedemptions, redemptionsApproved, redemptionsRejected,
    returnsToday, returnsWeek,
    scansByCounter,
    recentTxDocs,
  ] = await Promise.all([
    QrCode.countDocuments({ counterId: { $in: counterIds }, status: "scanned", scannedAt: { $gte: today } }),
    QrCode.countDocuments({ counterId: { $in: counterIds }, status: "scanned", scannedAt: { $gte: week } }),
    QrCode.countDocuments({ counterId: { $in: counterIds }, status: "scanned", scannedAt: { $gte: month } }),
    sumEarned(khatiIds),
    sumEarned(khatiIds, today),
    Redemption.countDocuments({ counterId: { $in: counterIds }, status: "pending" }),
    Redemption.countDocuments({ counterId: { $in: counterIds }, status: "approved" }),
    Redemption.countDocuments({ counterId: { $in: counterIds }, status: "rejected" }),
    Return.countDocuments({ counterId: { $in: counterIds }, createdAt: { $gte: today } }),
    Return.countDocuments({ counterId: { $in: counterIds }, createdAt: { $gte: week } }),
    QrCode.aggregate([
      { $match: { counterId: { $in: counterIds }, status: "scanned", scannedAt: { $gte: week } } },
      { $group: { _id: "$counterId", scans: { $sum: 1 } } },
    ]),
    khatiIds.length > 0
      ? PointTransaction.find({ khatiId: { $in: khatiIds } })
          .sort({ createdAt: -1 })
          .limit(8)
          .select("khatiId type points balanceAfter serialNo createdAt")
          .lean()
      : Promise.resolve([]),
  ]);

  const scanMap = new Map(scansByCounter.map((r) => [String(r._id), r.scans as number]));
  const khatiCountMap = new Map<string, number>();
  const khatiPointsMap = new Map<string, number>();
  for (const k of khatis) {
    const key = String(k.createdBy);
    khatiCountMap.set(key, (khatiCountMap.get(key) ?? 0) + 1);
    khatiPointsMap.set(key, (khatiPointsMap.get(key) ?? 0) + (k.points ?? 0));
  }

  const counterNameMap = new Map(counters.map((c) => [String(c._id), c.name || "—"]));
  const khatiNameMap = new Map(khatis.map((k) => [String(k._id), k.name ?? "—"]));

  const topCounters = counters
    .map((c) => ({
      name: c.name || "—",
      scans: scanMap.get(String(c._id)) ?? 0,
      khatis: khatiCountMap.get(String(c._id)) ?? 0,
      points: khatiPointsMap.get(String(c._id)) ?? 0,
    }))
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 5);

  const topKhatis = [...khatis]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 5)
    .map((k) => ({
      name: k.name || "—",
      points: k.points ?? 0,
      counter: counterNameMap.get(String(k.createdBy)) ?? "—",
    }));

  // Recent registrations: mix of recent counters + khatis sorted by createdAt
  const recentRegistrations = [
    ...counters.map((c) => ({ id: String(c._id), name: c.name ?? "—", role: "counter", status: "active", createdAt: c.createdAt as Date })),
    ...khatis.map((k) => ({ id: String(k._id), name: k.name ?? "—", role: "khati", status: k.status, kycStatus: k.kycStatus ?? undefined, createdAt: k.createdAt as Date })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  const recentTransactions = (recentTxDocs as Array<{
    _id: unknown; khatiId: unknown; type: string;
    points: number; balanceAfter: number; serialNo?: string; createdAt: Date;
  }>).map((t) => ({
    id: String(t._id),
    khatiName: khatiNameMap.get(String(t.khatiId)) ?? "—",
    type: t.type,
    points: t.points,
    balanceAfter: t.balanceAfter,
    serialNo: t.serialNo ?? "",
    createdAt: t.createdAt,
  }));

  return {
    counterTotal: counters.length,
    khatiTotal: khatis.length,
    khatiActive: khatis.filter((k) => k.status === "active").length,
    khatiPending: khatis.filter((k) => k.kycStatus && k.kycStatus !== "approved" && k.kycStatus !== "rejected").length,
    scansToday,
    scansWeek,
    scansMonth,
    pointsDistributed,
    pointsToday,
    pendingApprovals: khatis.filter((k) => k.kycStatus === "pending_sales_rep").length,
    pendingRedemptions,
    redemptionsApproved,
    redemptionsRejected,
    returnsToday,
    returnsWeek,
    topCounters,
    topKhatis,
    recentTransactions,
    recentRegistrations,
  };
}
