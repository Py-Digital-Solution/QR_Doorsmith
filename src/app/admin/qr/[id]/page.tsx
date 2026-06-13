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
import { Badge, statusTone } from "@/components/ui/Badge";
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
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; status?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";
  const filter: CodeFilter = (CODE_FILTERS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as CodeFilter)
    : "all";

  const batch = await getBatch(id);
  if (!batch) notFound();

  const [codes, products] = await Promise.all([
    listBatchCodes(id, pagination, filter, q || undefined),
    listActiveProducts(),
  ]);
  const productOptions = products.map((p) => ({ id: p.id, sku: p.sku, name: p.name }));

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  if (filter !== "all") fp.set("status", filter);
  const basePath = `/admin/qr/${id}?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin/qr"
          className="focus-ring inline-flex items-center gap-1 rounded-md text-xs font-medium text-brand-dark hover:underline"
        >
          ← Back to batches
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Batch · {batch.productSku}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
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
      <div className="flex flex-wrap gap-1.5">
        {CODE_FILTERS.map((f) => {
          const active = f === filter;
          const href = f === "all" ? `/admin/qr/${id}` : `/admin/qr/${id}?status=${f}`;
          return (
            <Link
              key={f}
              href={href}
              className={`focus-ring rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-brand text-white shadow-card"
                  : "border border-gray-300 bg-white text-gray-600 hover:border-brand/40 hover:text-brand-dark"
              }`}
            >
              {FILTER_LABELS[f]}
            </Link>
          );
        })}
      </div>

      <FilterBar
        placeholder="Search by serial or SKU…"
        exportType="qr-codes"
      />

      {codes.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="qr-code"
            title="No codes in this view"
            description="Try a different filter."
          />
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <MobileCardList>
            {codes.items.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-gray-900">{c.serialNo}</span>
                  <Badge tone="gray" className="uppercase">{c.type}</Badge>
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
          </MobileCardList>

          {/* Desktop: table */}
          <TableWrapper>
            <Table>
              <THead>
                <TH>Serial</TH>
                <TH>Type</TH>
                <TH>Parent</TH>
                <TH>SKU</TH>
                <TH>Status</TH>
                <TH>Counter</TH>
                <TH align="right">Actions</TH>
              </THead>
              <tbody>
                {codes.items.map((c) => (
                  <TR key={c.id} interactive>
                    <TD className="font-mono text-xs text-gray-900">{c.serialNo}</TD>
                    <TD className="text-xs text-gray-600 uppercase">{c.type}</TD>
                    <TD className="font-mono text-xs text-gray-500">
                      {c.parentSerial ?? "—"}
                    </TD>
                    <TD className="font-mono text-xs text-gray-600">{c.sku || "—"}</TD>
                    <TD>
                      <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                    </TD>
                    <TD className="text-xs text-gray-600">
                      {c.counterLabel ?? "—"}
                    </TD>
                    <TD>
                      <QrCodeActions code={c} batchId={id} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </>
      )}

      <Pagination
        page={codes.page}
        pageCount={codes.pageCount}
        total={codes.total}
        pageSize={codes.pageSize}
        basePath={basePath}
      />
    </div>
  );
}
