import { auth } from "@/auth";
import Link from "next/link";
import { getSalesDashboard } from "@/services/analytics";
import { ICONS } from "@/components/ui/icons";

const TYPE_LABEL: Record<string, string> = {
  scan_product: "Product Scan",
  scan_small_box: "Box Scan",
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
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function SalesDashboard() {
  const session = await auth();
  const d = await getSalesDashboard(session!.user.id);

  const TrendingUp = ICONS["trending-up"];
  const UsersIcon = ICONS["users"];
  const StoreIcon = ICONS["store"];
  const ScanIcon = ICONS["scan"];
  const GiftIcon = ICONS["gift"];
  const UndoIcon = ICONS["undo"];
  const UserCheckIcon = ICONS["user-check"];
  const HistoryIcon = ICONS["history"];
  const AlertIcon = ICONS["clock"];
  const CoinsIcon = ICONS["coins"];

  const pendingActions = d.pendingApprovals + d.pendingRedemptions;

  return (
    <div className="space-y-6">

      {/* ── Page title ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Overview</h1>
          <p className="mt-0.5 text-sm text-gray-500">Live snapshot of your sales network</p>
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

        {/* Points today */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Points Today</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">{d.pointsToday}</p>
              <p className="mt-1 text-xs text-gray-500">{d.pointsDistributed} all-time to {d.khatiActive} active khatis</p>
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
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">My Network</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">{d.khatiTotal}</p>
              <p className="mt-1 text-xs text-gray-500">{d.khatiActive} active khatis · {d.counterTotal} counters</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <UsersIcon className="size-5" aria-hidden />
            </span>
          </div>
        </div>

        {/* Needs attention */}
        <div className={`rounded-xl border p-5 shadow-card ${pendingActions > 0 ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-white"}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${pendingActions > 0 ? "text-yellow-600" : "text-gray-400"}`}>
                Needs Attention
              </p>
              <p className={`mt-2 text-4xl font-bold ${pendingActions > 0 ? "text-yellow-700" : "text-gray-900"}`}>{pendingActions}</p>
              <p className={`mt-1 text-xs ${pendingActions > 0 ? "text-yellow-600" : "text-gray-500"}`}>
                {d.pendingApprovals} KYC · {d.pendingRedemptions} redemptions
              </p>
            </div>
            <span className={`flex size-10 items-center justify-center rounded-xl ${pendingActions > 0 ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-500"}`}>
              <AlertIcon className="size-5" aria-hidden />
            </span>
          </div>
        </div>
      </div>

      {/* ── Action alerts ── */}
      {(d.pendingApprovals > 0 || d.pendingRedemptions > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {d.pendingApprovals > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                  <UserCheckIcon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-yellow-800">{d.pendingApprovals} KYC pending</p>
                  <p className="text-xs text-yellow-600">Khati registrations awaiting your approval</p>
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
                  <p className="text-xs text-orange-600">Across your counters  awaiting approval</p>
                </div>
              </div>
              <Link
                href="/sales/ledger"
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
              >
                View →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Two-column: Activity + Recent registrations ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Recent activity */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <HistoryIcon className="size-4 text-gray-400" aria-hidden />
              <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <Link href="/sales/ledger" className="text-xs font-medium text-brand-dark hover:underline">
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
            <Link href="/sales" className="text-xs font-medium text-brand-dark hover:underline">
              All counters →
            </Link>
          </div>
          {d.recentRegistrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <StoreIcon className="mb-2 size-8 text-gray-200" aria-hidden />
              <p className="text-sm text-gray-400">No registrations yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {d.recentRegistrations.map((u) => {
                const statusColor =
                  u.status === "active" ? "bg-green-50 text-green-700"
                  : u.kycStatus?.startsWith("pending") ? "bg-yellow-50 text-yellow-700"
                  : "bg-gray-100 text-gray-500";
                const statusLabel =
                  u.status === "active" ? "Active"
                  : u.kycStatus === "pending_counter" ? "Pending Counter"
                  : u.kycStatus === "pending_sales_rep" ? "Pending Review"
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
              <h2 className="text-sm font-semibold text-gray-900">Top Counters (7-day scans)</h2>
            </div>
            <Link href="/sales" className="text-xs font-medium text-brand-dark hover:underline">
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
                    <th className="pb-2 text-right">Khatis</th>
                    <th className="pb-2 text-right">Scans (7d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.topCounters.map((c, i) => {
                    const max = d.topCounters[0].scans || 1;
                    return (
                      <tr key={i} className="hover:bg-gray-50/40">
                        <td className="py-2 text-xs font-bold text-gray-300">#{i + 1}</td>
                        <td className="py-2">
                          <span className="text-xs font-medium text-gray-800">{c.name}</span>
                          <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                            <div
                              className="h-1 rounded-full bg-brand"
                              style={{ width: `${Math.round((c.scans / max) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2 text-right text-xs text-gray-500">{c.khatis}</td>
                        <td className="py-2 text-right font-bold text-brand-dark">{c.scans}</td>
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
          {/* Redemptions breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <GiftIcon className="size-4 text-gray-400" aria-hidden />
              <h3 className="text-sm font-semibold text-gray-900">Redemptions</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="size-2 rounded-full bg-yellow-400" /> Pending
                </span>
                <span className="text-sm font-bold text-gray-800">{d.pendingRedemptions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="size-2 rounded-full bg-green-500" /> Approved
                </span>
                <span className="text-sm font-bold text-gray-800">{d.redemptionsApproved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="size-2 rounded-full bg-red-400" /> Rejected
                </span>
                <span className="text-sm font-bold text-gray-800">{d.redemptionsRejected}</span>
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
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h3>
            <div className="space-y-1">
              {[
                { href: "/sales", label: "Manage counters", icon: "store" as const },
                { href: "/approvals", label: "Review approvals", icon: "user-check" as const },
                { href: "/sales/ledger", label: "Points ledger", icon: "receipt" as const },
                { href: "/sales?create=1", label: "Create counter", icon: "users" as const },
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
