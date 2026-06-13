import { auth } from "@/auth";
import { listCounterDispatches } from "@/services/dispatch";
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

const billLink =
  "focus-ring inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-light";

export default async function CounterDispatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const result = await listCounterDispatches(session!.user.id, pagination, q || undefined);

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/counter/dispatches?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Dispatch history" description="Bills dispatched to your counter." />

      <FilterBar placeholder="Search by bill no…" exportType="counter-dispatches" />

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState icon="truck" title="No dispatches received yet" description="Stock dispatched to your counter will appear here." />
        </div>
      ) : (
        <>
          <MobileCardList className="space-y-2">
            {result.items.map((d) => (
              <div key={d.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium text-gray-900">{d.billNo}</span>
                  <a href={`/admin/dispatch/${d.id}/bill`} target="_blank" rel="noopener noreferrer" className={billLink}>
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
          </MobileCardList>

          <TableWrapper>
            <Table>
              <THead>
                <TH>Bill No</TH>
                <TH>Date</TH>
                <TH align="right">Units</TH>
                <TH align="right">Codes</TH>
                <TH align="right">PDF</TH>
              </THead>
              <tbody>
                {result.items.map((d) => (
                  <TR key={d.id} interactive>
                    <TD className="font-mono text-xs font-medium text-gray-900">{d.billNo}</TD>
                    <TD className="text-xs text-gray-500">{d.createdAt.slice(0, 10)}</TD>
                    <TD align="right" className="text-xs text-gray-600">{d.unitCount}</TD>
                    <TD align="right" className="text-xs text-gray-600">{d.totalCodes}</TD>
                    <TD align="right">
                      <a href={`/admin/dispatch/${d.id}/bill`} target="_blank" rel="noopener noreferrer" className={billLink}>
                        Bill PDF
                      </a>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
            basePath={basePath}
          />
        </>
      )}
    </div>
  );
}
