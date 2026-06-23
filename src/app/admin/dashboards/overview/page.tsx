import Link from "next/link";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { QrCode } from "@/models/QrCode";
import { Return } from "@/models/Return";
import { Redemption } from "@/models/Redemption";
import { PointTransaction } from "@/models/PointTransaction";
import { ICONS } from "@/components/ui/icons";

// ─── data ────────────────────────────────────────────────────────────────────

async function getOverviewData() {
  await connectDB();
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalKhatis,
    activeKhatis,
    totalCounters,
    totalSalesReps,
    scansToday,
    scansWeek,
    scansMonth,
    pointsWeek,
    pendingKyc,
    pendingRedemptions,
    returnsToday,
    returnsWeek,
    recentTransactions,
    recentUsers,
    topCounters,
    redemptionsByStatus,
  ] = await Promise.all([
    User.countDocuments({ role: "khati" }),
    User.countDocuments({ role: "khati", status: "active" }),
    User.countDocuments({ role: "counter" }),
    User.countDocuments({ role: { $in: ["sales_rep", "distributor"] } }),
    QrCode.countDocuments({ status: "scanned", scannedAt: { $gte: todayStart } }),
    QrCode.countDocuments({ status: "scanned", scannedAt: { $gte: weekStart } }),
    QrCode.countDocuments({ status: "scanned", scannedAt: { $gte: monthStart } }),
    // Points reversed this week (negative transactions  redemptions, returns)
    PointTransaction.aggregate([
      { $match: { createdAt: { $gte: weekStart }, points: { $lt: 0 } } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]),
    User.countDocuments({ role: "khati", kycStatus: { $in: ["pending_counter", "pending_sales_rep", "pending_admin"] } }),
    Redemption.countDocuments({ status: "pending" }),
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
    // Top 5 counters by all-time scan volume
    QrCode.aggregate([
      { $match: { status: "scanned" } },
      { $group: { _id: "$counterId", scans: { $sum: 1 } } },
      { $sort: { scans: -1 } },
      { $limit: 5 },
    ]),
    // Redemption breakdown
    Redemption.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  // Resolve counter names for top counters
  const counterIds = topCounters.map((r: { _id: unknown }) => r._id);
  const counterDocs = await User.find({ _id: { $in: counterIds } }).select("name").lean();
  const counterNameMap = new Map(counterDocs.map((c) => [String(c._id), c.name || "—"]));

  // Resolve khati names for recent transactions
  const khatiIds = [...new Set(recentTransactions.map((t: { khatiId: unknown }) => String(t.khatiId)))];
  const khatiDocs = await User.find({ _id: { $in: khatiIds } }).select("name phone").lean();
  const khatiNameMap = new Map(khatiDocs.map((k) => [String(k._id), k.name || k.phone || "—"]));

  const redemptionMap = Object.fromEntries(
    (redemptionsByStatus as { _id: string; count: number }[]).map((r) => [r._id, r.count])
  );

  return {
    totalKhatis, activeKhatis, totalCounters, totalSalesReps,
    scansToday, scansWeek, scansMonth,
    pointsWeek: Math.abs(pointsWeek[0]?.total ?? 0),
    pendingKyc, pendingRedemptions,
    returnsToday, returnsWeek,
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
    topCounters: topCounters.map((r: { _id: unknown; scans: number }) => ({
      name: counterNameMap.get(String(r._id)) ?? "",
      scans: r.scans,
    })),
    redemptionsPending: redemptionMap["pending"] ?? 0,
    redemptionsApproved: redemptionMap["approved"] ?? 0,
    redemptionsRejected: redemptionMap["rejected"] ?? 0,
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

export default async function OverviewDashboard() {
  const d = await getOverviewData();
  const TrendingUp = ICONS["trending-up"];
  const UsersIcon = ICONS["users"];
  const StoreIcon = ICONS["store"];
  const ScanIcon = ICONS["scan"];
  const CoinsIcon = ICONS["coins"];
  const GiftIcon = ICONS["gift"];
  const UndoIcon = ICONS["undo"];
  const UserCheckIcon = ICONS["user-check"];
  const HistoryIcon = ICONS["history"];
  const AlertIcon = ICONS["clock"];

  const pendingActions = d.pendingKyc + d.pendingRedemptions;

  return (
    <div className="space-y-6">

      {/* ── Page title ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Overview</h1>
          <p className="mt-0.5 text-sm text-gray-500">Live snapshot of the DoorSmith network</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
          Live data
        </div>
      </div>

      {/* ── Hero KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Scans today */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Scans Today</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">{d.scansToday}</p>
              <p className="mt-1 text-xs text-gray-500">{d.scansWeek} this week · {d.scansMonth} this month</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ScanIcon className="size-5" aria-hidden />
            </span>
          </div>
        </div>

        {/* Points this week */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Points Reversed (7 days)</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">{d.pointsWeek}</p>
              <p className="mt-1 text-xs text-gray-500">Redeemed / returned across {d.activeKhatis} active khatis</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <TrendingUp className="size-5" aria-hidden />
            </span>
          </div>
        </div>

        {/* Network */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Network Size</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">{d.totalKhatis + d.totalCounters + d.totalSalesReps}</p>
              <p className="mt-1 text-xs text-gray-500">{d.totalKhatis} khatis · {d.totalCounters} counters · {d.totalSalesReps} reps</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <UsersIcon className="size-5" aria-hidden />
            </span>
          </div>
        </div>

        {/* Pending actions */}
        <div className={`rounded-xl border p-5 shadow-card ${pendingActions > 0 ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-white"}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${pendingActions > 0 ? "text-yellow-600" : "text-gray-400"}`}>
                Needs Attention
              </p>
              <p className={`mt-2 text-4xl font-bold ${pendingActions > 0 ? "text-yellow-700" : "text-gray-900"}`}>{pendingActions}</p>
              <p className={`mt-1 text-xs ${pendingActions > 0 ? "text-yellow-600" : "text-gray-500"}`}>
                {d.pendingKyc} KYC · {d.pendingRedemptions} redemptions
              </p>
            </div>
            <span className={`flex size-10 items-center justify-center rounded-xl ${pendingActions > 0 ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-500"}`}>
              <AlertIcon className="size-5" aria-hidden />
            </span>
          </div>
        </div>
      </div>

      {/* ── Action alerts ── */}
      {(d.pendingKyc > 0 || d.pendingRedemptions > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {d.pendingKyc > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                  <UserCheckIcon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-yellow-800">{d.pendingKyc} KYC pending</p>
                  <p className="text-xs text-yellow-600">Khati registrations awaiting verification</p>
                </div>
              </div>
              <Link
                href="/approvals"
                className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700"
              >
                Review →
              </Link>
            </div>
          )}
          {d.pendingRedemptions > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <GiftIcon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-orange-800">{d.pendingRedemptions} redemption{d.pendingRedemptions > 1 ? "s" : ""} pending</p>
                  <p className="text-xs text-orange-600">Points redemption requests awaiting approval</p>
                </div>
              </div>
              <Link
                href="/admin/users"
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
              >
                View →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Two-column: Activity + Registrations ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

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
      </div>

      {/* ── Bottom row: Top counters + Quick stats ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Top counters */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <StoreIcon className="size-4 text-gray-400" aria-hidden />
              <h2 className="text-sm font-semibold text-gray-900">Top Counters (all-time scans)</h2>
            </div>
            <Link href="/admin/users?role=counter" className="text-xs font-medium text-brand-dark hover:underline">
              Manage →
            </Link>
          </div>
          {d.topCounters.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <StoreIcon className="mb-2 size-8 text-gray-200" aria-hidden />
              <p className="text-sm text-gray-400">No counters yet</p>
            </div>
          ) : (
            <div className="px-4 py-3">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase text-gray-400">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Counter</th>
                    <th className="pb-2 text-right">Total Scans</th>
                    <th className="pb-2 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.topCounters.map((c, i) => {
                    const max = d.topCounters[0].scans || 1;
                    const pct = Math.round((c.scans / d.scansMonth || 0) * 100);
                    return (
                      <tr key={i} className="hover:bg-gray-50/40">
                        <td className="py-2 text-xs font-bold text-gray-300">#{i + 1}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-800">{c.name}</span>
                          </div>
                          {/* mini progress bar */}
                          <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                            <div
                              className="h-1 rounded-full bg-brand"
                              style={{ width: `${Math.round((c.scans / max) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2 text-right font-bold text-brand-dark">{c.scans.toLocaleString()}</td>
                        <td className="py-2 text-right text-xs text-gray-400">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick stats sidebar */}
        <div className="space-y-3">
          {/* Redemption breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <GiftIcon className="size-4 text-gray-400" aria-hidden />
              <h3 className="text-sm font-semibold text-gray-900">Redemptions</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="size-2 rounded-full bg-yellow-400" /> Pending
                </span>
                <span className="font-bold text-gray-800">{d.redemptionsPending}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="size-2 rounded-full bg-green-500" /> Approved
                </span>
                <span className="font-bold text-gray-800">{d.redemptionsApproved}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="size-2 rounded-full bg-red-400" /> Rejected
                </span>
                <span className="font-bold text-gray-800">{d.redemptionsRejected}</span>
              </div>
            </div>
          </div>

          {/* Returns */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <UndoIcon className="size-4 text-gray-400" aria-hidden />
              <h3 className="text-sm font-semibold text-gray-900">Returns</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Today</span>
                <span className="text-sm font-bold text-gray-800">{d.returnsToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Last 7 days</span>
                <span className="text-sm font-bold text-gray-800">{d.returnsWeek}</span>
              </div>
            </div>
            <Link
              href="/admin/returns"
              className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              View all returns
            </Link>
          </div>

          {/* Quick links */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h3>
            <div className="space-y-1">
              {[
                { href: "/admin/users", label: "Create user", icon: "users" as const },
                { href: "/admin/qr", label: "Generate QR codes", icon: "qr-code" as const },
                { href: "/admin/dispatch", label: "Dispatch stock", icon: "truck" as const },
                { href: "/approvals", label: "Review approvals", icon: "user-check" as const },
              ].map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Icon className="size-3.5 text-gray-400" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
