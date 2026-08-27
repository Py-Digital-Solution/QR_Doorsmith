import { auth } from "@/auth";
import Link from "next/link";
import { parsePageParams } from "@/lib/pagination";
import { listPointTransactions, summarizePointTransactions, ledgerTypeLabel } from "@/services/ledger";
import type { PtType } from "@/models/PointTransaction";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/Pagination";
import { LedgerTable } from "@/components/LedgerTable";

const TYPES: PtType[] = [
  "scan_product",
  "scan_small_box",
  "return_reversal",
  "redemption_lock",
  "manual_adjustment",
];

import { isCounterRewardsEnabled, isReturnsEnabled } from "@/services/settings";

export default async function LedgerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; type?: string; userType?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const [counterRewardsEnabled, returnsEnabled] = await Promise.all([
    isCounterRewardsEnabled(),
    isReturnsEnabled(),
  ]);

  const activeTypes = TYPES.filter((t) => {
    if (t === "return_reversal" && !returnsEnabled) return false;
    return true;
  });

  const type = (activeTypes.includes(sp.type as PtType) ? sp.type : undefined) as PtType | undefined;
  let userType = (sp.userType === "khati" || (sp.userType === "counter" && counterRewardsEnabled) ? sp.userType : "all") as "khati" | "counter" | "all";

  const orgIdFilter = session?.user?.role === "super_admin" ? undefined : session?.user?.orgId;
  const filter = { search: q || undefined, type, userType, orgId: orgIdFilter };
  const [page, summary] = await Promise.all([
    listPointTransactions(filter, pagination),
    summarizePointTransactions(filter),
  ]);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (type) baseParams.set("type", type);
  if (userType !== "all") baseParams.set("userType", userType);
  baseParams.set("pageSize", String(pagination.pageSize));
  const basePath = `/admin/dashboards/ledger?${baseParams.toString()}`;

  function userTabHref(ut: "all" | "khati" | "counter") {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (type) p.set("type", type);
    if (ut !== "all") p.set("userType", ut);
    return `/admin/dashboards/ledger?${p.toString()}`;
  }

  function pillHref(t?: PtType) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (t) p.set("type", t);
    if (userType !== "all") p.set("userType", userType);
    return `/admin/dashboards/ledger?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points Ledger"
        description="Every point movement across the network  scans, returns, and redemptions."
      />

      {/* User Category Tabs */}
      <div className="flex border-b border-gray-200">
        <Link
          href={userTabHref("all")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            userType === "all"
              ? "border-brand text-brand"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          All Ledgers
        </Link>
        <Link
          href={userTabHref("khati")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            userType === "khati"
              ? "border-brand text-brand"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          Karigar Points
        </Link>
        {counterRewardsEnabled && (
          <Link
            href={userTabHref("counter")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              userType === "counter"
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Counter Points
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Points Earned" value={summary.totalEarned} icon="trending-up" tone="green" />
        <StatCard label="Points Deducted" value={summary.totalDeducted} icon="undo" tone="red" />
        <StatCard label="Net Points" value={summary.net} icon="coins" tone="brand" />
        <StatCard label="Total Entries" value={summary.entryCount} icon="indian-rupee" tone="blue" />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={pillHref(undefined)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              !type ? "bg-brand text-white ring-brand" : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-50"
            }`}
          >
            All Types
          </Link>
          {activeTypes.map((t) => (
            <Link
              key={t}
              href={pillHref(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                type === t ? "bg-brand text-white ring-brand" : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-50"
              }`}
            >
              {ledgerTypeLabel(t)}
            </Link>
          ))}
        </div>

        <form method="get" className="flex gap-2">
          {type && <input type="hidden" name="type" value={type} />}
          {userType !== "all" && <input type="hidden" name="userType" value={userType} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by serial no. or SKU…"
            className="min-w-[180px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      {page.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState icon="receipt" title="No transactions" description="No point movements match these filters yet." />
        </div>
      ) : (
        <LedgerTable items={page.items} />
      )}

      <Pagination
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
        pageSize={page.pageSize}
        basePath={basePath}
      />
    </div>
  );
}
