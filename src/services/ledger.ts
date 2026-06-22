import "server-only";
import { connectDB } from "@/db/mongoose";
import { PointTransaction, type PtType } from "@/models/PointTransaction";
import { User } from "@/models/User";
import { Types } from "mongoose";
import { paginated, type Pagination, type Paginated, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export type LedgerEntry = {
  id: string;
  khatiId: string;
  khatiName: string;
  type: PtType;
  points: number;
  balanceAfter: number;
  description: string;
  sku: string;
  serialNo: string;
  createdAt: string;
};

export type LedgerFilter = {
  khatiId?: string;
  type?: PtType;
  /** restrict to a set of khati IDs (e.g. a counter's khatis) */
  khatiIds?: string[];
  /** inclusive lower bound on createdAt */
  since?: Date;
  search?: string;
};

const TYPE_LABELS: Record<PtType, string> = {
  scan_product: "Product scan",
  scan_small_box: "Small box scan",
  return_reversal: "Return reversal",
  redemption_lock: "Redemption",
  redemption_unlock: "Redemption refund",
  manual_adjustment: "Manual adjustment",
};

export function ledgerTypeLabel(t: string): string {
  return TYPE_LABELS[t as PtType] ?? t;
}

function buildQuery(filter: LedgerFilter): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  if (filter.khatiId) {
    q.khatiId = new Types.ObjectId(filter.khatiId);
  } else if (filter.khatiIds?.length) {
    q.khatiId = { $in: filter.khatiIds.map((id) => new Types.ObjectId(id)) };
  }
  if (filter.type) q.type = filter.type;
  if (filter.since) q.createdAt = { $gte: filter.since };
  if (filter.search) {
    q.$or = [
      { serialNo: { $regex: filter.search, $options: "i" } },
      { sku: { $regex: filter.search, $options: "i" } },
    ];
  }
  return q;
}

/** Paginated ledger feed  newest first. Resolves khati names in one batch. */
export async function listPointTransactions(
  filter: LedgerFilter = {},
  pagination: Pagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
): Promise<Paginated<LedgerEntry>> {
  await connectDB();
  const q = buildQuery(filter);
  const { page, pageSize } = pagination;

  const [total, docs] = await Promise.all([
    PointTransaction.countDocuments(q),
    PointTransaction.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  // Resolve khati names in one query.
  const ids = [...new Set(docs.map((d) => String(d.khatiId)))];
  const users = await User.find({ _id: { $in: ids } }).select("name phone").lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u.name || u.phone || ""]));

  return paginated(
    docs.map((d) => ({
      id: String(d._id),
      khatiId: String(d.khatiId),
      khatiName: nameMap.get(String(d.khatiId)) ?? "",
      type: d.type as PtType,
      points: d.points ?? 0,
      balanceAfter: d.balanceAfter ?? 0,
      description: d.description ?? "",
      sku: d.sku ?? "",
      serialNo: d.serialNo ?? "",
      createdAt: (d.createdAt as Date)?.toISOString() ?? "",
    })),
    total,
    pagination,
  );
}

export type LedgerSummary = {
  totalEarned: number;
  totalDeducted: number;
  net: number;
  entryCount: number;
  byType: { type: PtType; label: string; points: number; count: number }[];
};

/** Aggregate totals for the same filter, used as ledger header cards. */
export async function summarizePointTransactions(filter: LedgerFilter = {}): Promise<LedgerSummary> {
  await connectDB();
  const q = buildQuery(filter);

  const rows = await PointTransaction.aggregate([
    { $match: q },
    { $group: { _id: "$type", points: { $sum: "$points" }, count: { $sum: 1 } } },
  ]);

  let totalEarned = 0;
  let totalDeducted = 0;
  let entryCount = 0;
  const byType: LedgerSummary["byType"] = [];

  for (const r of rows) {
    const pts = r.points ?? 0;
    entryCount += r.count ?? 0;
    if (pts >= 0) totalEarned += pts;
    else totalDeducted += pts;
    byType.push({ type: r._id as PtType, label: ledgerTypeLabel(r._id), points: pts, count: r.count ?? 0 });
  }
  byType.sort((a, b) => b.count - a.count);

  return {
    totalEarned,
    totalDeducted,
    net: totalEarned + totalDeducted,
    entryCount,
    byType,
  };
}
