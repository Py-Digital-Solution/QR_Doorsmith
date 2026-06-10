import { auth } from "@/auth";
import { listCounterDispatches } from "@/services/dispatch";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";

export default async function CounterDispatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const pagination = parsePageParams(await searchParams);
  const result = await listCounterDispatches(session!.user.id, pagination);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dispatch history</h1>
        <p className="text-sm text-gray-500">Bills dispatched to your counter.</p>
      </div>

      {result.items.length === 0 ? (
        <p className="text-sm text-gray-500">No dispatches received yet.</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2 sm:hidden">
            {result.items.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium">{d.billNo}</span>
                  <a
                    href={`/admin/dispatch/${d.id}/bill`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-dark hover:underline"
                  >
                    Bill PDF
                  </a>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-gray-500">
                  <span>{d.createdAt.slice(0, 10)}</span>
                  <span>{d.unitCount} unit(s)</span>
                  <span>{d.totalCodes} codes</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Bill No</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Units</th>
                  <th className="px-4 py-2 text-right">Codes</th>
                  <th className="px-4 py-2 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs font-medium">{d.billNo}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {d.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-2 text-right text-xs">{d.unitCount}</td>
                    <td className="px-4 py-2 text-right text-xs">{d.totalCodes}</td>
                    <td className="px-4 py-2 text-right">
                      <a
                        href={`/admin/dispatch/${d.id}/bill`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-brand-dark hover:underline"
                      >
                        Bill PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
            basePath="/counter/dispatches"
          />
        </>
      )}
    </div>
  );
}
