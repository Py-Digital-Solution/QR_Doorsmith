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

const pointsPill =
  "rounded-full bg-green-50 font-bold text-green-700 ring-1 ring-inset ring-green-600/20";

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
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-card"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900">{s.serialNo}</p>
                  {s.sku && <p className="text-xs text-gray-400">{s.sku}</p>}
                  <p className="text-xs text-gray-400">
                    {s.scannedAt.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <span className={`${pointsPill} px-3 py-1 text-sm`}>
                  +{s.pointsEarned}
                </span>
              </div>
            ))}
          </MobileCardList>

          {/* Desktop */}
          <TableWrapper>
            <Table>
              <THead>
                <TH>Serial No</TH>
                <TH>SKU</TH>
                <TH>Date</TH>
                <TH align="right">Points</TH>
              </THead>
              <tbody>
                {scans.items.map((s) => (
                  <TR key={s.id} interactive>
                    <TD className="font-mono text-xs text-gray-900">{s.serialNo}</TD>
                    <TD className="text-xs text-gray-500">{s.sku || "—"}</TD>
                    <TD className="text-xs text-gray-500">
                      {s.scannedAt.slice(0, 16).replace("T", " ")}
                    </TD>
                    <TD align="right">
                      <span className={`${pointsPill} px-2 py-0.5 text-xs`}>
                        +{s.pointsEarned}
                      </span>
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
