import { auth } from "@/auth";
import { listKhatiScans } from "@/services/khati";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";

export default async function KhatiHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const pagination = parsePageParams(await searchParams);
  const scans = await listKhatiScans(session!.user.id, pagination);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Scan history</h1>
        <p className="text-sm text-gray-500">{scans.total} product codes scanned total.</p>
      </div>

      {scans.items.length === 0 ? (
        <p className="text-sm text-gray-400">No scans yet.</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2 sm:hidden">
            {scans.items.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div>
                  <p className="font-mono text-sm font-medium">{s.serialNo}</p>
                  {s.sku && <p className="text-xs text-gray-400">{s.sku}</p>}
                  <p className="text-xs text-gray-400">{s.scannedAt.slice(0, 16).replace("T", " ")}</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                  +{s.pointsEarned}
                </span>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Serial No</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {scans.items.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{s.serialNo}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{s.sku || "—"}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {s.scannedAt.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                        +{s.pointsEarned}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={scans.page}
            pageCount={scans.pageCount}
            total={scans.total}
            pageSize={scans.pageSize}
            basePath="/khati/history"
          />
        </>
      )}
    </div>
  );
}
