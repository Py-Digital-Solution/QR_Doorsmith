import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBatch,
  listBatchCodes,
  CODE_FILTERS,
  type CodeFilter,
} from "@/services/qr";
import { listActiveProducts } from "@/services/products";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { BatchActions } from "@/components/BatchActions";
import { QrCodeActions } from "@/components/QrCodeActions";

const FILTER_LABELS: Record<CodeFilter, string> = {
  all: "All",
  warehouse: "In warehouse",
  dispatched: "Dispatched",
  scanned: "Scanned",
};

export default async function BatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const filter: CodeFilter = (CODE_FILTERS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as CodeFilter)
    : "all";

  const batch = await getBatch(id);
  if (!batch) notFound();

  const [codes, products] = await Promise.all([
    listBatchCodes(id, pagination, filter),
    listActiveProducts(),
  ]);
  const productOptions = products.map((p) => ({ id: p.id, sku: p.sku, name: p.name }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/qr" className="text-xs text-brand-dark hover:underline">
          ← Back to batches
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Batch · {batch.productSku}</h1>
          <p className="text-sm text-gray-500">
            {batch.masterCount}×{batch.smallPerMaster}×{batch.productPerSmall} ·{" "}
            <span className="font-medium">{batch.total} codes</span> · {batch.status}
          </p>
          <p className="mt-0.5 text-xs">
            <span className="text-amber-700">{batch.warehouseCount} in warehouse</span>
            {" · "}
            <span className="text-green-700">{batch.dispatchedCount} dispatched</span>
          </p>
        </div>
        <BatchActions batch={batch} products={productOptions} redirectOnDelete />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1">
        {CODE_FILTERS.map((f) => {
          const active = f === filter;
          const href = f === "all" ? `/admin/qr/${id}` : `/admin/qr/${id}?status=${f}`;
          return (
            <Link
              key={f}
              href={href}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-brand text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {FILTER_LABELS[f]}
            </Link>
          );
        })}
      </div>

      {codes.items.length === 0 ? (
        <p className="text-sm text-gray-500">No codes in this view.</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 sm:hidden">
            {codes.items.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">{c.serialNo}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-600">
                    {c.type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {c.sku || "—"} · {c.status}
                  {c.parentSerial ? ` · parent ${c.parentSerial}` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {c.counterLabel ? `→ ${c.counterLabel}` : "In warehouse"}
                </p>
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <QrCodeActions code={c} batchId={id} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Serial</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Parent</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Counter</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.items.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{c.serialNo}</td>
                    <td className="px-4 py-2 text-xs uppercase text-gray-600">{c.type}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">
                      {c.parentSerial ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{c.sku || "—"}</td>
                    <td className="px-4 py-2">{c.status}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {c.counterLabel ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <QrCodeActions code={c} batchId={id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Pagination
        page={codes.page}
        pageCount={codes.pageCount}
        total={codes.total}
        pageSize={codes.pageSize}
        basePath={filter === "all" ? `/admin/qr/${id}` : `/admin/qr/${id}?status=${filter}`}
      />
    </div>
  );
}
