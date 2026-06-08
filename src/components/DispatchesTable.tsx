import type { DispatchDTO } from "@/services/dispatch";

function BillLink({ id }: { id: string }) {
  return (
    <a
      href={`/admin/dispatch/${id}/bill`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded px-2 py-1 text-xs font-medium text-brand-dark hover:bg-brand-light"
    >
      Bill PDF
    </a>
  );
}

export function DispatchesTable({ dispatches }: { dispatches: DispatchDTO[] }) {
  if (dispatches.length === 0) {
    return <p className="text-sm text-gray-500">No dispatches yet.</p>;
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="space-y-3 sm:hidden">
        {dispatches.map((d) => (
          <div key={d.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium">{d.billNo}</span>
              <BillLink id={d.id} />
            </div>
            <p className="mt-1 text-sm">→ {d.counterLabel}</p>
            <p className="text-sm text-gray-500">
              {d.unitCount} item(s) · {d.totalCodes} codes
            </p>
            <p className="text-xs text-gray-400">{d.createdAt.slice(0, 10)}</p>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Bill</th>
              <th className="px-4 py-2">Counter</th>
              <th className="px-4 py-2 text-right">Items</th>
              <th className="px-4 py-2 text-right">Codes</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 text-right">Print</th>
            </tr>
          </thead>
          <tbody>
            {dispatches.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 font-mono">{d.billNo}</td>
                <td className="px-4 py-2">{d.counterLabel}</td>
                <td className="px-4 py-2 text-right">{d.unitCount}</td>
                <td className="px-4 py-2 text-right font-medium">{d.totalCodes}</td>
                <td className="px-4 py-2">{d.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-2 text-right">
                  <BillLink id={d.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
