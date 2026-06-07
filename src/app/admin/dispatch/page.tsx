import { listDispatches } from "@/services/dispatch";
import { listCounters } from "@/services/users";
import { parsePageParams } from "@/lib/pagination";
import { DispatchClient } from "@/components/DispatchClient";
import { DispatchesTable } from "@/components/DispatchesTable";
import { Pagination } from "@/components/Pagination";

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
      <div>
        <h1 className="text-lg font-semibold">Dispatch</h1>
        <p className="text-sm text-gray-500">
          Scan master boxes and send stock to a counter (auto-activates the codes).
        </p>
      </div>

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
