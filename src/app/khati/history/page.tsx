import { auth } from "@/auth";
import { listKhatiScans } from "@/services/khati";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
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

function PointsBadge({ points, isReturn }: { points: number; isReturn: boolean }) {
  return isReturn ? (
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
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const scans = await listKhatiScans(session!.user.id, pagination, q || undefined);

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/khati/history?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transaction history"
        description={`${scans.total} transactions total (scans + returns).`}
      />

      <FilterBar placeholder="Search by serial or SKU…" exportType="khati-history" />

      {scans.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState icon="history" title="No scans yet" description="Your scanned QR codes will appear here." />
        </div>
      ) : (
        <>
          <MobileCardList className="space-y-2">
            {scans.items.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-card ${
                  s.isReturn ? "border-red-100 bg-red-50/20" : "border-gray-200"
                }`}
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900">{s.serialNo}</p>
                  {s.sku && <p className="text-xs text-gray-400">{s.sku}</p>}
                  <p className="text-xs text-gray-400">{s.scannedAt.slice(0, 16).replace("T", " ")}</p>
                  {s.isReturn && <p className="text-xs font-medium text-red-500">Product returned</p>}
                </div>
                <PointsBadge points={s.points} isReturn={s.isReturn} />
              </div>
            ))}
          </MobileCardList>

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
                    <TD>
                      <p className="font-mono text-xs text-gray-900">{s.serialNo}</p>
                      {s.isReturn && <p className="text-xs font-medium text-red-500">Product returned</p>}
                    </TD>
                    <TD className="text-xs text-gray-500">{s.sku || "—"}</TD>
                    <TD className="text-xs text-gray-500">{s.scannedAt.slice(0, 16).replace("T", " ")}</TD>
                    <TD align="right">
                      <PointsBadge points={s.points} isReturn={s.isReturn} />
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
            basePath={basePath}
          />
        </>
      )}
    </div>
  );
}
