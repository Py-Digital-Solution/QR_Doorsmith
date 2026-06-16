import type { DispatchDTO } from "@/services/dispatch";
import {
  TableWrapper,
  Table,
  THead,
  TH,
  TR,
  TD,
  MobileCardList,
  MobileCard,
} from "./ui/Table";
import { EmptyState } from "./ui/EmptyState";

function BillLink({ id }: { id: string }) {
  return (
    <a
      href={`/admin/dispatch/${id}/bill`}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-light"
    >
      Dispatch Receipt
    </a>
  );
}

export function DispatchesTable({ dispatches }: { dispatches: DispatchDTO[] }) {
  if (dispatches.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-card">
        <EmptyState
          icon="truck"
          title="No dispatches yet"
          description="Dispatched stock will appear here."
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <MobileCardList>
        {dispatches.map((d) => (
          <MobileCard
            key={d.id}
            title={<span className="font-mono">{d.billNo}</span>}
            badge={<BillLink id={d.id} />}
          >
            <p className="text-sm text-gray-700">→ {d.counterLabel}</p>
            <p>{d.unitCount} item(s) · {d.totalCodes} codes</p>
            <p className="text-gray-400">{d.createdAt.slice(0, 10)}</p>
          </MobileCard>
        ))}
      </MobileCardList>

      {/* Desktop: table */}
      <TableWrapper>
        <Table>
          <THead>
            <TH>Receipt No</TH>
            <TH>Counter</TH>
            <TH align="right">Items</TH>
            <TH align="right">Codes</TH>
            <TH>Date</TH>
            <TH align="right">Print</TH>
          </THead>
          <tbody>
            {dispatches.map((d) => (
              <TR key={d.id} interactive>
                <TD className="font-mono text-gray-900">{d.billNo}</TD>
                <TD className="text-gray-600">{d.counterLabel}</TD>
                <TD align="right" className="text-gray-600">{d.unitCount}</TD>
                <TD align="right" className="font-medium text-gray-900">
                  {d.totalCodes}
                </TD>
                <TD className="text-gray-600">{d.createdAt.slice(0, 10)}</TD>
                <TD align="right">
                  <BillLink id={d.id} />
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
    </>
  );
}
