import type { DispatchDTO } from "@/services/dispatch";
import { formatISTDate } from "@/lib/datetime";
import { DispatchRowAction } from "./DispatchRowAction";
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

function StatusBadge({ status }: { status: string }) {
  const isDraft = status === "draft";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isDraft ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
      }`}
    >
      {isDraft ? "Draft" : "Dispatched"}
    </span>
  );
}

function EditLink({ id }: { id: string }) {
  return (
    <a
      href={`/admin/dispatch/${id}/edit`}
      className="focus-ring inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
    >
      Edit
    </a>
  );
}

function Action({ d }: { d: DispatchDTO }) {
  return d.status === "draft" ? (
    <div className="flex items-center justify-end gap-1">
      <EditLink id={d.id} />
      <DispatchRowAction dispatchId={d.id} />
    </div>
  ) : (
    <BillLink id={d.id} />
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
            badge={<StatusBadge status={d.status} />}
          >
            <p className="text-sm text-gray-700">→ {d.counterLabel}</p>
            <p>{d.unitCount} item(s) · {d.totalCodes} codes</p>
            <p className="text-gray-400">{formatISTDate(d.createdAt)}</p>
            <div className="mt-2">
              <Action d={d} />
            </div>
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
            <TH>Status</TH>
            <TH>Date</TH>
            <TH align="right">Action</TH>
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
                <TD><StatusBadge status={d.status} /></TD>
                <TD className="text-gray-600">{formatISTDate(d.createdAt)}</TD>
                <TD align="right">
                  <Action d={d} />
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
    </>
  );
}
