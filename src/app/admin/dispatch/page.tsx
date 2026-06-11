import { listDispatches } from "@/services/dispatch";
import { listCounters } from "@/services/users";
import { parsePageParams } from "@/lib/pagination";
import { DispatchClient } from "@/components/DispatchClient";
import { DispatchesTable } from "@/components/DispatchesTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const pagination = parsePageParams(await searchParams);
  const [result, counters] = await Promise.all([
    listDispatches(pagination),
    listCounters(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch"
        description="Scan any unit — master box, small box, or a unique product code — and send stock to a counter (auto-activates the codes)."
      />

      <DispatchClient counters={counters} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Recent dispatches</h2>
        <DispatchesTable dispatches={result.items} />
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          basePath="/admin/dispatch"
        />
      </div>
    </div>
  );
}
