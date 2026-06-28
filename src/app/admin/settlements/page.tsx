import { PageHeader } from "@/components/ui/PageHeader";
import { listCounterSettlements } from "@/services/settlement";
import { SettleCounterButton } from "@/components/SettleCounterButton";
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

export default async function AdminSettlementsPage() {
  const rows = await listCounterSettlements();

  const totalOutstanding = rows.reduce((s, r) => s + r.outstandingPoints, 0);
  const totalSettled = rows.reduce((s, r) => s + r.settledPoints, 0);
  const countersDue = rows.filter((r) => r.outstandingPoints > 0).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settle up"
        description="Reimburse counters for the redemption points they have paid out to karigars. Settling clears a counter's outstanding balance."
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Outstanding</p>
          <p className="mt-2 text-3xl font-bold text-orange-700">{totalOutstanding.toLocaleString()}</p>
          <p className="mt-1 text-xs text-orange-600">{countersDue} counter{countersDue === 1 ? "" : "s"} to settle</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Settled all-time</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalSettled.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-500">points reimbursed</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Counters</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{rows.length}</p>
          <p className="mt-1 text-xs text-gray-500">have processed redemptions</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="wallet"
            title="No redemptions to settle"
            description="Once counters approve karigar redemptions, their balances will appear here."
          />
        </div>
      ) : (
        <>
          <MobileCardList className="space-y-2">
            {rows.map((r) => (
              <div key={r.counterId} className="rounded-lg border border-gray-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Store className="size-4 shrink-0 text-brand" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{r.counterName}</p>
                      {r.counterPhone && <p className="text-xs text-gray-400">{r.counterPhone}</p>}
                    </div>
                  </div>
                  <p className={`shrink-0 text-lg font-bold ${r.outstandingPoints > 0 ? "text-orange-600" : "text-gray-400"}`}>
                    {r.outstandingPoints} pts
                  </p>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>Total: <span className="font-medium text-gray-700">{r.totalPoints}</span></span>
                  <span>Settled: <span className="font-medium text-gray-700">{r.settledPoints}</span></span>
                </div>
                <div className="mt-3">
                  <SettleCounterButton
                    counterId={r.counterId}
                    counterName={r.counterName}
                    outstandingPoints={r.outstandingPoints}
                  />
                </div>
              </div>
            ))}
          </MobileCardList>

          <TableWrapper>
            <Table>
              <THead>
                <TH>Counter</TH>
                <TH align="right">Total approved</TH>
                <TH align="right">Settled</TH>
                <TH align="right">Outstanding</TH>
                <TH>Action</TH>
              </THead>
              <tbody>
                {rows.map((r) => (
                  <TR key={r.counterId}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Store className="size-4 shrink-0 text-brand" aria-hidden />
                        <div>
                          <p className="font-medium text-gray-900">{r.counterName}</p>
                          {r.counterPhone && <p className="text-xs text-gray-400">{r.counterPhone}</p>}
                        </div>
                      </div>
                    </TD>
                    <TD align="right" className="text-gray-700">{r.totalPoints}</TD>
                    <TD align="right" className="text-gray-500">{r.settledPoints}</TD>
                    <TD align="right">
                      <span className={`font-bold ${r.outstandingPoints > 0 ? "text-orange-600" : "text-gray-400"}`}>
                        {r.outstandingPoints}
                      </span>
                    </TD>
                    <TD>
                      <SettleCounterButton
                        counterId={r.counterId}
                        counterName={r.counterName}
                        outstandingPoints={r.outstandingPoints}
                      />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </>
      )}
    </div>
  );
}
