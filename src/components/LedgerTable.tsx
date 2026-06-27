import { ledgerTypeLabel } from "@/services/ledger";
import type { LedgerEntry } from "@/services/ledger";
import { formatISTDateTime } from "@/lib/datetime";

const TYPE_TONE: Record<string, string> = {
  scan_product: "bg-green-50 text-green-700 ring-green-600/20",
  scan_small_box: "bg-green-50 text-green-700 ring-green-600/20",
  return_reversal: "bg-red-50 text-red-600 ring-red-200",
  redemption_lock: "bg-brand-light text-brand-dark ring-brand/20",
  redemption_unlock: "bg-blue-50 text-blue-600 ring-blue-200",
  manual_adjustment: "bg-gray-100 text-gray-600 ring-gray-300",
};

function typeBadge(type: string) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TYPE_TONE[type] ?? TYPE_TONE.manual_adjustment}`}>
      {ledgerTypeLabel(type as LedgerEntry["type"])}
    </span>
  );
}

function fmtDate(iso: string) {
  return formatISTDateTime(iso);
}

/** Responsive points-ledger view: table on sm+, stacked cards on mobile. */
export function LedgerTable({ items }: { items: LedgerEntry[] }) {
  return (
    <>
      {/* ── Desktop / tablet table ── */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-card sm:block">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50">
            <tr className="text-left text-xs font-semibold uppercase text-gray-500">
              <th className="px-4 py-2.5">Karigar</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Detail</th>
              <th className="px-4 py-2.5 text-right">Points</th>
              <th className="px-4 py-2.5 text-right">Balance</th>
              <th className="px-4 py-2.5 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{e.khatiName}</td>
                <td className="px-4 py-2.5">{typeBadge(e.type)}</td>
                <td className="px-4 py-2.5 text-gray-500">
                  {e.serialNo ? <span className="font-mono text-xs">{e.serialNo}</span> : e.description || "—"}
                </td>
                <td className={`px-4 py-2.5 text-right font-bold ${e.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {e.points >= 0 ? `+${e.points}` : e.points}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">{e.balanceAfter}</td>
                <td className="px-4 py-2.5 text-right text-xs text-gray-400">{fmtDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="space-y-3 sm:hidden">
        {items.map((e) => (
          <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{e.khatiName}</p>
                <div className="mt-1">{typeBadge(e.type)}</div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-base font-bold ${e.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {e.points >= 0 ? `+${e.points}` : e.points}
                </p>
                <p className="text-[11px] text-gray-400">Bal: {e.balanceAfter}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2.5 text-xs text-gray-400">
              <span className="min-w-0 truncate">
                {e.serialNo ? <span className="font-mono">{e.serialNo}</span> : e.description || "—"}
              </span>
              <span className="shrink-0 pl-2">{fmtDate(e.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
