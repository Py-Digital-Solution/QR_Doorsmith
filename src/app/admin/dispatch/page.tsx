import { listDispatches } from "@/services/dispatch";
import { listCounters } from "@/services/users";
import { parsePageParams } from "@/lib/pagination";
import { DispatchClient } from "@/components/DispatchClient";
import { DispatchesTable } from "@/components/DispatchesTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const [result, counters] = await Promise.all([
    listDispatches(pagination, q || undefined),
    listCounters(),
  ]);

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/admin/dispatch?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dispatch"
        description="Scan any unit  master box, small box, or a unique product code  and send stock to a counter."
      />

      <DispatchClient counters={counters} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Recent dispatches</h2>

        <FilterBar placeholder="Search by receipt no…" exportType="dispatches" />

        <DispatchesTable dispatches={result.items} />

        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          basePath={basePath}
        />
      </div>
    </div>
  );
}
