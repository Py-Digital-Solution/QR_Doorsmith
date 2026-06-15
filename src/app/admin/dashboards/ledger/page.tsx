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

export default async function LedgerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";
  const type = (TYPES.includes(sp.type as PtType) ? sp.type : undefined) as PtType | undefined;

  const filter = { search: q || undefined, type };
  const [page, summary] = await Promise.all([
    listPointTransactions(filter, pagination),
    summarizePointTransactions(filter),
  ]);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (type) baseParams.set("type", type);
  baseParams.set("pageSize", String(pagination.pageSize));
  const basePath = `/admin/dashboards/ledger?${baseParams.toString()}`;

  function pillHref(t?: PtType) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (t) p.set("type", t);
    return `/admin/dashboards/ledger?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points Ledger"
        description="Every point movement across the network — scans, returns, and redemptions."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Points Earned" value={summary.totalEarned} icon="trending-up" tone="green" />
        <StatCard label="Points Deducted" value={summary.totalDeducted} icon="undo" tone="red" />
        <StatCard label="Net Points" value={summary.net} icon="coins" tone="brand" />
        <StatCard label="Total Entries" value={summary.entryCount} icon="receipt" tone="blue" />
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
            All
          </Link>
          {TYPES.map((t) => (
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
