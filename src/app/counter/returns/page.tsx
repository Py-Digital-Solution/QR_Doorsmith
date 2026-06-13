import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { CounterReturnPanel } from "@/components/CounterReturnPanel";
import { listCounterReturns } from "@/services/returns";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TableWrapper,
  Table,
  THead,
  TH,
  TR,
  TD,
  MobileCardList,
} from "@/components/ui/Table";
import { Store } from "lucide-react";

export default async function CounterReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const pagination = parsePageParams(await searchParams);
  const history = await listCounterReturns(session!.user.id, pagination);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process Return"
        description="Scan a product QR code to reverse the khati's points and reactivate it for resale."
      />

      <CounterReturnPanel />

      {/* Return history */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Return history</h2>

        {history.items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-card">
            <EmptyState
              icon="undo"
              title="No returns yet"
              description="Processed product returns will appear here."
            />
          </div>
        ) : (
          <>
            {/* Mobile */}
            <MobileCardList className="space-y-2">
              {history.items.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-gray-800">{r.serialNo}</p>
                      {r.sku && <p className="text-xs text-gray-400">{r.sku}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                      −{r.pointsReversed} pts
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">
                    Returned by <span className="font-medium">{r.khatiName}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Store className="size-3.5 shrink-0 text-brand" aria-hidden />
                    <span className="font-medium text-gray-600">{r.counterName}</span>
                    <span className="ml-auto text-gray-400">{r.createdAt.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </MobileCardList>

            {/* Desktop */}
            <TableWrapper>
              <Table>
                <THead>
                  <TH>Serial / SKU</TH>
                  <TH>Khati</TH>
                  <TH>Counter</TH>
                  <TH>Date</TH>
                  <TH align="right">Points reversed</TH>
                </THead>
                <tbody>
                  {history.items.map((r) => (
                    <TR key={r.id} interactive>
                      <TD>
                        <p className="font-mono text-xs font-semibold text-gray-800">{r.serialNo}</p>
                        {r.sku && <p className="text-xs text-gray-400">{r.sku}</p>}
                      </TD>
                      <TD className="font-medium text-gray-900">{r.khatiName}</TD>
                      <TD>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Store className="size-3.5 shrink-0 text-brand" aria-hidden />
                          {r.counterName}
                        </div>
                      </TD>
                      <TD className="text-xs text-gray-500">{r.createdAt.slice(0, 10)}</TD>
                      <TD align="right">
                        <span className="font-semibold text-red-600">−{r.pointsReversed}</span>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>

            <Pagination
              page={history.page}
              pageCount={history.pageCount}
              total={history.total}
              pageSize={history.pageSize}
              basePath="/counter/returns"
            />
          </>
        )}
      </div>
    </div>
  );
}
