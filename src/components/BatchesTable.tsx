import Link from "next/link";
import type { BatchDTO } from "@/services/qr";
import { formatSerial } from "@/lib/qr";
import { BatchActions } from "./BatchActions";
import type { ProductOption } from "./GenerateBatchForm";

function PdfLink({ id }: { id: string }) {
  return (
    <a
      href={`/admin/qr/${id}/pdf`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded px-2 py-1 text-xs font-medium text-brand-dark hover:bg-brand-light"
    >
      PDF
    </a>
  );
}

function ManageLink({ id }: { id: string }) {
  return (
    <Link
      href={`/admin/qr/${id}`}
      className="rounded px-2 py-1 text-xs font-medium text-brand-dark hover:bg-brand-light"
    >
      Manage
    </Link>
  );
}

export function BatchesTable({
  batches,
  products,
}: {
  batches: BatchDTO[];
  products: ProductOption[];
}) {
  if (batches.length === 0) {
    return <p className="text-sm text-gray-500">No batches yet.</p>;
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="space-y-3 sm:hidden">
        {batches.map((b) => (
          <div key={b.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs">{b.productSku}</span>
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
                {b.status}
              </span>
            </div>
            <p className="mt-1 text-sm">
              {b.masterCount}×{b.smallPerMaster}×{b.productPerSmall} ·{" "}
              <span className="font-medium">{b.total} codes</span>
            </p>
            <p className="mt-0.5 text-xs">
              <span className="text-amber-700">{b.warehouseCount} in warehouse</span>
              {" · "}
              <span className="text-green-700">{b.dispatchedCount} dispatched</span>
            </p>
            <p className="font-mono text-xs text-gray-500">
              {formatSerial("master", b.serialStart)} – {formatSerial("master", b.serialEnd)}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">{b.createdAt.slice(0, 10)}</span>
              <div className="flex items-center gap-1">
                <ManageLink id={b.id} />
                <PdfLink id={b.id} />
              </div>
            </div>
            <div className="mt-1 border-t border-gray-100 pt-2">
              <BatchActions batch={b} products={products} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Structure (M×S×P)</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Warehouse / Sent</th>
              <th className="px-4 py-2">Serial range</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2">{b.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-2 font-mono text-xs">{b.productSku}</td>
                <td className="px-4 py-2">
                  {b.masterCount}×{b.smallPerMaster}×{b.productPerSmall}
                </td>
                <td className="px-4 py-2 text-right font-medium">{b.total}</td>
                <td className="px-4 py-2 text-right text-xs">
                  <span className="text-amber-700">{b.warehouseCount}</span>
                  {" / "}
                  <span className="text-green-700">{b.dispatchedCount}</span>
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {formatSerial("master", b.serialStart)} – {formatSerial("master", b.serialEnd)}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <ManageLink id={b.id} />
                    <PdfLink id={b.id} />
                    <BatchActions batch={b} products={products} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
