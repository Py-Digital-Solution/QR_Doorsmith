import { auth } from "@/auth";
import { listKhatiScans } from "@/services/khati";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  TableWrapper,
  Table,
  THead,
  TH,
  TR,
  TD,
  MobileCardList,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

function PointsBadge({ points, returned }: { points: number; returned: boolean }) {
  return returned ? (
    <div className="flex flex-col items-end gap-0.5">
      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 ring-1 ring-inset ring-red-200">
        −{points}
      </span>
      <span className="text-[9px] font-semibold tracking-wide text-red-400 uppercase">Returned</span>
    </div>
  ) : (
    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700 ring-1 ring-inset ring-green-600/20">
      +{points}
    </span>
  );
}

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
      <PageHeader
        title="Scan history"
        description={`${scans.total} product codes scanned total.`}
      />

      {scans.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="history"
            title="No scans yet"
            description="Your scanned QR codes will appear here."
          />
        </div>
      ) : (
        <>
          {/* Mobile */}
          <MobileCardList className="space-y-2">
            {scans.items.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-card ${
                  s.returned ? "border-red-100" : "border-gray-200"
                }`}
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900">{s.serialNo}</p>
                  {s.sku && <p className="text-xs text-gray-400">{s.sku}</p>}
                  <p className="text-xs text-gray-400">
                    {s.scannedAt.slice(0, 16).replace("T", " ")}
                  </p>
                  {s.returned && s.returnedAt && (
                    <p className="text-xs text-red-400">
                      Returned {s.returnedAt.slice(0, 10)}
                    </p>
                  )}
                </div>
                <PointsBadge points={s.pointsEarned} returned={s.returned} />
              </div>
            ))}
          </MobileCardList>

          {/* Desktop */}
          <TableWrapper>
            <Table>
              <THead>
                <TH>Serial No</TH>
                <TH>SKU</TH>
                <TH>Scanned</TH>
                <TH align="right">Points</TH>
              </THead>
              <tbody>
                {scans.items.map((s) => (
                  <TR key={s.id} interactive>
                    <TD className="font-mono text-xs text-gray-900">{s.serialNo}</TD>
                    <TD className="text-xs text-gray-500">{s.sku || "—"}</TD>
                    <TD className="text-xs text-gray-500">
                      <p>{s.scannedAt.slice(0, 16).replace("T", " ")}</p>
                      {s.returned && s.returnedAt && (
                        <p className="text-red-400">Returned {s.returnedAt.slice(0, 10)}</p>
                      )}
                    </TD>
                    <TD align="right">
                      <PointsBadge points={s.pointsEarned} returned={s.returned} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

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
