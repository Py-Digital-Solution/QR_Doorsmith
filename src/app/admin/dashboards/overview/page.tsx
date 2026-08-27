import Link from "next/link";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { QrCode } from "@/models/QrCode";
import { Return } from "@/models/Return";
import { PointTransaction } from "@/models/PointTransaction";
import { ICONS } from "@/components/ui/icons";
import { istStartOfToday, daysAgo } from "@/lib/datetime";
import {
  isReturnsEnabled,
  isCounterRewardsEnabled,
  isDispatchEnabled,
  isDistributorEnabled,
} from "@/services/settings";

// ─── data ────────────────────────────────────────────────────────────────────

type DateRangeParams = {
  fy?: string;
  from?: string;
  to?: string;
};

function resolveDateRange(params?: DateRangeParams) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
  const baseFyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  if (params?.from && params?.to) {
    const startDate = new Date(`${params.from}T00:00:00.000Z`);
    const endDate = new Date(`${params.to}T23:59:59.999Z`);
    const label = `${params.from} to ${params.to}`;
    return {
      startDate,
      endDate,
      label,
      mode: "custom" as const,
      from: params.from,
      to: params.to,
    };
  }

  const isPrevious = params?.fy === "previous";
  const fyStartYear = isPrevious ? baseFyStartYear - 1 : baseFyStartYear;
  const startDate = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0)); // Apr 1
  const endDate = new Date(Date.UTC(fyStartYear + 1, 2, 31, 23, 59, 59, 999)); // Mar 31
  const label = `FY ${fyStartYear}–${String(fyStartYear + 1).slice(2)}`;
  const defaultFrom = startDate.toISOString().slice(0, 10);
  const defaultTo = (isPrevious ? endDate : now).toISOString().slice(0, 10);

  return {
    startDate,
    endDate,
    label,
    mode: isPrevious ? ("previous" as const) : ("current" as const),
    from: params?.from || defaultFrom,
    to: params?.to || defaultTo,
  };
}

async function getOverviewData(params?: DateRangeParams) {
  await connectDB();
  const todayStart = istStartOfToday();
  const weekStart = daysAgo(7);
  const dateRange = resolveDateRange(params);

  const [returnsEnabled, counterRewardsEnabled, dispatchEnabled, distributorEnabled] = await Promise.all([
    isReturnsEnabled(),
    isCounterRewardsEnabled(),
    isDispatchEnabled(),
    isDistributorEnabled(),
  ]);

  const [
    totalKhatis,
    activeKhatis,
    totalCounters,
    totalSalesReps,
    counterPointsAgg,
    karigarPointsAgg,
    pendingKyc,
    returnsToday,
    returnsWeek,
    recentTransactions,
    recentUsers,
    topCounters,
    topKarigarsAgg,
  ] = await Promise.all([
    User.countDocuments({ role: "khati" }),
    User.countDocuments({ role: "khati", status: "active" }),
    User.countDocuments({ role: "counter" }),
    User.countDocuments({ role: distributorEnabled ? { $in: ["sales_rep", "distributor"] } : "sales_rep" }),
    // Total Points to be redeemed (Counter)
    User.aggregate([
      { $match: { role: "counter" } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]),
    // Total Points to be redeemed (Karigar)
    User.aggregate([
      { $match: { role: "khati" } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]),
    // Needs Attention (Only KYC)
    User.countDocuments({ role: "khati", kycStatus: { $in: ["pending_counter", "pending_sales_rep", "pending_admin"] } }),
    Return.countDocuments({ createdAt: { $gte: todayStart } }),
    Return.countDocuments({ createdAt: { $gte: weekStart } }),
    // Recent 8 point transactions
    PointTransaction.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select("khatiId type points balanceAfter serialNo createdAt")
      .lean(),
    // Recent 6 registrations (khati or counter)
    User.find({ role: { $in: ["khati", "counter"] } })
      .sort({ createdAt: -1 })
      .limit(6)
      .select("name phone role status kycStatus createdAt")
      .lean(),
    // Top 5 counters sales-wise by counter reward points in selected date range
    QrCode.aggregate([
      {
        $match: {
          counterId: { $ne: null },
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: { path: "$product", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$counterId",
          unitsDispatched: { $sum: 1 },
          counterPoints: {
            $sum: {
              $ifNull: [
                "$counterRewardPoints",
                { $ifNull: ["$product.counterRewardPoints", 0] },
              ],
            },
          },
        },
      },
      { $sort: { counterPoints: -1, unitsDispatched: -1 } },
      { $limit: 5 },
    ]),
    // Top 5 Karigars by points earned in selected date range
    PointTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
          points: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$khatiId",
          pointsEarned: { $sum: "$points" },
          transactionsCount: { $sum: 1 },
        },
      },
      { $sort: { pointsEarned: -1, transactionsCount: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const totalCounterPoints = counterPointsAgg[0]?.total ?? 0;
  const totalKarigarPoints = karigarPointsAgg[0]?.total ?? 0;

  // Resolve counter names for top counters
  const counterIds = topCounters.map((r: { _id: unknown }) => r._id);
  const counterDocs = await User.find({ _id: { $in: counterIds } }).select("name phone").lean();
  const counterNameMap = new Map(counterDocs.map((c) => [String(c._id), c.name || c.phone || "—"]));

  // Resolve karigar names for top karigars
  const karigarIds = topKarigarsAgg.map((r: { _id: unknown }) => r._id);
  const karigarDocs = await User.find({ _id: { $in: karigarIds } }).select("name phone").lean();
  const karigarNameMap = new Map(karigarDocs.map((k) => [String(k._id), k.name || k.phone || "—"]));

  // Resolve khati names for recent transactions
  const khatiIds = [...new Set(recentTransactions.map((t: { khatiId: unknown }) => String(t.khatiId)))];
  const khatiDocs = await User.find({ _id: { $in: khatiIds } }).select("name phone").lean();
  const khatiNameMap = new Map(khatiDocs.map((k) => [String(k._id), k.name || k.phone || "—"]));

  return {
    totalKhatis,
    activeKhatis,
    totalCounters,
    totalSalesReps,
    networkSize: totalKhatis + totalCounters + totalSalesReps,
    totalCounterPoints,
    totalKarigarPoints,
    pendingKyc,
    returnsToday,
    returnsWeek,
    returnsEnabled,
    counterRewardsEnabled,
    dispatchEnabled,
    distributorEnabled,
    dateRange,
    recentTransactions: recentTransactions.map((t: {
      _id: unknown; khatiId: unknown; type: string;
      points: number; balanceAfter: number; serialNo?: string; createdAt: Date;
    }) => ({
      id: String(t._id),
      khatiName: khatiNameMap.get(String(t.khatiId)) ?? "—",
      type: t.type,
      points: t.points,
      balanceAfter: t.balanceAfter,
      serialNo: t.serialNo ?? "",
      createdAt: t.createdAt,
    })),
    recentUsers: recentUsers.map((u) => ({
      id: String(u._id),
      name: u.name ?? u.phone ?? "—",
      role: u.role,
      status: u.status,
      kycStatus: u.kycStatus,
      createdAt: u.createdAt as Date,
    })),
    topCounters: topCounters.map((r: { _id: unknown; unitsDispatched: number; counterPoints: number }) => ({
      name: counterNameMap.get(String(r._id)) ?? "",
      units: r.unitsDispatched,
      counterPoints: r.counterPoints,
    })),
    topKarigars: topKarigarsAgg.map((r: { _id: unknown; pointsEarned: number; transactionsCount: number }) => ({
      name: karigarNameMap.get(String(r._id)) ?? "",
      points: r.pointsEarned,
      scans: r.transactionsCount,
    })),
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  scan_product: "Product Scan",
  scan_small_box: "Small Box Scan",
  return_reversal: "Return",
  redemption_lock: "Redemption",
  redemption_unlock: "Refund",
  manual_adjustment: "Adjustment",
};

const TYPE_COLOR: Record<string, string> = {
  scan_product: "bg-green-50 text-green-700",
  scan_small_box: "bg-green-50 text-green-700",
  return_reversal: "bg-red-50 text-red-600",
  redemption_lock: "bg-orange-50 text-orange-600",
  redemption_unlock: "bg-blue-50 text-blue-600",
  manual_adjustment: "bg-gray-100 text-gray-600",
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function OverviewDashboard({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; from?: string; to?: string }>;
}) {
  const resolvedParams = await searchParams;
  const d = await getOverviewData(resolvedParams);

  const TrendingUp = ICONS["trending-up"];
  const UsersIcon = ICONS["users"];
  const StoreIcon = ICONS["store"];
  const CoinsIcon = ICONS["coins"];
  const UndoIcon = ICONS["undo"];
  const UserCheckIcon = ICONS["user-check"];
  const HistoryIcon = ICONS["history"];
  const AlertIcon = ICONS["clock"];
  const AwardIcon = ICONS["coins"];

  return (
    <div className="space-y-6">

      {/* ── Page title ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Overview</h1>
          <p className="mt-0.5 text-sm text-gray-500">Live network snapshot & performance summary</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
          Live data
        </div>
      </div>

      {/* ── Top Hero KPIs ── */}
      <div className={`grid gap-4 ${d.counterRewardsEnabled ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
        {/* 1. Network Size */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Network Size</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">{d.networkSize}</p>
              <p className="mt-1 text-xs text-gray-500">{d.totalKhatis} karigars · {d.totalCounters} counters · {d.totalSalesReps} staff</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <UsersIcon className="size-5" aria-hidden />
            </span>
          </div>
        </div>

        {/* 2. Total Points to be redeemed (Counter) - Only if counter rewards enabled */}
        {d.counterRewardsEnabled && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Counter Points to Redeem</p>
                <p className="mt-2 text-4xl font-bold text-blue-700">{d.totalCounterPoints.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">Total active points across counters</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CoinsIcon className="size-5" aria-hidden />
              </span>
            </div>
          </div>
        )}

        {/* 3. Total Points to be redeemed (Karigar) */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Karigar Points to Redeem</p>
              <p className="mt-2 text-4xl font-bold text-green-600">{d.totalKarigarPoints.toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">Total active points across karigars</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <TrendingUp className="size-5" aria-hidden />
            </span>
          </div>
        </div>

        {/* 4. Needs Attention (Only KYC) */}
        <div className={`rounded-xl border p-5 shadow-card ${d.pendingKyc > 0 ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-white"}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${d.pendingKyc > 0 ? "text-yellow-600" : "text-gray-400"}`}>
                Needs Attention
              </p>
              <p className={`mt-2 text-4xl font-bold ${d.pendingKyc > 0 ? "text-yellow-700" : "text-gray-900"}`}>{d.pendingKyc}</p>
              <p className={`mt-1 text-xs ${d.pendingKyc > 0 ? "text-yellow-600" : "text-gray-500"}`}>
                {d.pendingKyc} Karigar KYC pending verification
              </p>
            </div>
            <span className={`flex size-10 items-center justify-center rounded-xl ${d.pendingKyc > 0 ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-500"}`}>
              <AlertIcon className="size-5" aria-hidden />
            </span>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/admin/users", label: "Create User", icon: "users" as const, desc: "Add counter/karigar", show: true },
            { href: "/admin/qr", label: "Generate QR", icon: "qr-code" as const, desc: "Batches & sheets", show: true },
            { href: "/admin/dispatch", label: "Dispatch Stock", icon: "truck" as const, desc: "Send to counters", show: d.dispatchEnabled },
            { href: "/approvals", label: "KYC Approvals", icon: "user-check" as const, desc: `${d.pendingKyc} pending`, show: true },
          ].filter(item => item.show).map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-3 transition-colors hover:border-brand/30 hover:bg-brand-light/30"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs text-brand-dark">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{item.label}</p>
                  <p className="text-[11px] text-gray-500">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Action alert banner (if KYC pending) ── */}
      {d.pendingKyc > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              <UserCheckIcon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-yellow-800">{d.pendingKyc} Karigar KYC verification{d.pendingKyc > 1 ? "s" : ""} pending</p>
              <p className="text-xs text-yellow-600">Review submitted identity documents and counter endorsements</p>
            </div>
          </div>
          <Link
            href="/approvals"
            className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700"
          >
            Review Approvals →
          </Link>
        </div>
      )}

      {/* ── Performance Filter Bar (From / To Calendar + Current FY / Previous FY) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-card">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Leaderboard & Sales Performance</h2>
          <p className="text-xs text-gray-500">
            {d.counterRewardsEnabled ? "Top 5 Counters by sales reward points and Top 5 Karigars for: " : "Top 5 Karigars for: "}
            <span className="font-semibold text-brand-dark">{d.dateRange.label}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick FY buttons */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs shadow-xs">
            <Link
              href="/admin/dashboards/overview?fy=current"
              className={`rounded-md px-3 py-1 font-medium transition ${
                d.dateRange.mode === "current"
                  ? "bg-white font-bold text-brand shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Current FY
            </Link>
            <Link
              href="/admin/dashboards/overview?fy=previous"
              className={`rounded-md px-3 py-1 font-medium transition ${
                d.dateRange.mode === "previous"
                  ? "bg-white font-bold text-brand shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Previous FY
            </Link>
          </div>

          {/* From & To Calendar Form */}
          <form method="GET" action="/admin/dashboards/overview" className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-gray-500">From:</span>
              <input
                type="date"
                name="from"
                defaultValue={d.dateRange.from}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-gray-500">To:</span>
              <input
                type="date"
                name="to"
                defaultValue={d.dateRange.to}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-3 py-1 font-semibold text-white shadow-xs hover:bg-gray-800 transition"
            >
              Filter
            </button>
            {d.dateRange.mode === "custom" && (
              <Link
                href="/admin/dashboards/overview"
                className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1 font-medium text-gray-600 hover:bg-gray-200 transition"
              >
                Reset
              </Link>
            )}
          </form>
        </div>
      </div>

      {/* ── Leaderboard: Top 5 Counters (if enabled) & Top 5 Karigars ── */}
      <div className={`grid grid-cols-1 gap-6 ${d.counterRewardsEnabled ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>

        {/* 1. Top Counters by Sales (Only if counter rewards enabled) */}
        {d.counterRewardsEnabled && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <StoreIcon className="size-4 text-gray-400" aria-hidden />
                <h2 className="text-sm font-semibold text-gray-900">
                  Top 5 Counters ({d.dateRange.label})
                </h2>
              </div>
              <Link href="/admin/users?role=counter" className="text-xs font-medium text-brand-dark hover:underline">
                View all →
              </Link>
            </div>
            {d.topCounters.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <StoreIcon className="mb-2 size-8 text-gray-200" aria-hidden />
                <p className="text-sm text-gray-400">No counter data for {d.dateRange.label}</p>
              </div>
            ) : (
              <div className="px-4 py-3">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase text-gray-400">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Counter</th>
                      <th className="pb-2 text-right">Units</th>
                      <th className="pb-2 text-right">Counter Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {d.topCounters.map((c, i) => {
                      const max = d.topCounters[0].counterPoints || 1;
                      return (
                        <tr key={i} className="hover:bg-gray-50/40">
                          <td className="py-2.5 text-xs font-bold text-gray-300">#{i + 1}</td>
                          <td className="py-2.5">
                            <span className="text-xs font-medium text-gray-800">{c.name}</span>
                            <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                              <div
                                className="h-1 rounded-full bg-blue-600"
                                style={{ width: `${Math.round((c.counterPoints / max) * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 text-right font-medium text-gray-700">{c.units.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-bold text-blue-700">{c.counterPoints.toLocaleString()} pts</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. Top 5 Karigars */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <AwardIcon className="size-4 text-green-600" aria-hidden />
              <h2 className="text-sm font-semibold text-gray-900">
                Top 5 Karigars ({d.dateRange.label})
              </h2>
            </div>
            <Link href="/admin/users?role=khati" className="text-xs font-medium text-brand-dark hover:underline">
              View all →
            </Link>
          </div>
          {d.topKarigars.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <AwardIcon className="mb-2 size-8 text-gray-200" aria-hidden />
              <p className="text-sm text-gray-400">No karigar activity for {d.dateRange.label}</p>
            </div>
          ) : (
            <div className="px-4 py-3">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase text-gray-400">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Karigar</th>
                    <th className="pb-2 text-right">Scans</th>
                    <th className="pb-2 text-right">Points Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.topKarigars.map((k, i) => {
                    const max = d.topKarigars[0].points || 1;
                    return (
                      <tr key={i} className="hover:bg-gray-50/40">
                        <td className="py-2.5 text-xs font-bold text-gray-300">#{i + 1}</td>
                        <td className="py-2.5">
                          <span className="text-xs font-medium text-gray-800">{k.name}</span>
                          <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                            <div
                              className="h-1 rounded-full bg-green-500"
                              style={{ width: `${Math.round((k.points / max) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-medium text-gray-700">{k.scans.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-bold text-green-600">{k.points.toLocaleString()} pts</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Two-column: Activity + Registrations (+ Optional Returns) ── */}
      <div className={`grid grid-cols-1 gap-6 ${d.returnsEnabled ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>

        {/* Recent activity */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <HistoryIcon className="size-4 text-gray-400" aria-hidden />
              <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <Link href="/admin/dashboards/ledger" className="text-xs font-medium text-brand-dark hover:underline">
              Full ledger →
            </Link>
          </div>
          {d.recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <CoinsIcon className="mb-2 size-8 text-gray-200" aria-hidden />
              <p className="text-sm text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {d.recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60">
                  <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLOR[t.type] ?? TYPE_COLOR.manual_adjustment}`}>
                    {TYPE_LABEL[t.type] ?? t.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-800">{t.khatiName}</p>
                    {t.serialNo && <p className="font-mono text-[10px] text-gray-400">{t.serialNo}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${t.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.points >= 0 ? `+${t.points}` : t.points}
                    </p>
                    <p className="text-[10px] text-gray-400">{timeAgo(t.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent registrations */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <UsersIcon className="size-4 text-gray-400" aria-hidden />
              <h2 className="text-sm font-semibold text-gray-900">Recent Registrations</h2>
            </div>
            <Link href="/admin/users" className="text-xs font-medium text-brand-dark hover:underline">
              All users →
            </Link>
          </div>
          {d.recentUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <UsersIcon className="mb-2 size-8 text-gray-200" aria-hidden />
              <p className="text-sm text-gray-400">No users yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {d.recentUsers.map((u) => {
                const statusColor =
                  u.status === "active" ? "bg-green-50 text-green-700"
                  : u.kycStatus?.startsWith("pending") ? "bg-yellow-50 text-yellow-700"
                  : "bg-gray-100 text-gray-500";
                const statusLabel =
                  u.status === "active" ? "Active"
                  : u.kycStatus === "pending_counter" ? "Pending Counter"
                  : u.kycStatus === "pending_sales_rep" ? "Pending Sales"
                  : u.kycStatus === "pending_admin" ? "Pending Admin"
                  : u.status;
                return (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand-dark">
                      {u.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-800">{u.name}</p>
                      <p className="text-[10px] capitalize text-gray-400">{u.role.replace("_", " ")}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(u.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Returns summary (Only if returns enabled) */}
        {d.returnsEnabled && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2">
              <UndoIcon className="size-4 text-gray-400" aria-hidden />
              <h3 className="text-sm font-semibold text-gray-900">Returns</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Today</span>
                <span className="font-bold text-gray-900">{d.returnsToday}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Last 7 days</span>
                <span className="font-bold text-gray-900">{d.returnsWeek}</span>
              </div>
            </div>
            <Link
              href="/admin/returns"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              View all returns →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
