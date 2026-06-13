import { listBatches } from "@/services/qr";
import { listActiveProducts } from "@/services/products";
import { parsePageParams } from "@/lib/pagination";
import { GenerateBatchPanel } from "@/components/GenerateBatchPanel";
import { BatchesTable } from "@/components/BatchesTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";

export default async function QrPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const [result, products] = await Promise.all([
    listBatches(pagination, q || undefined),
    listActiveProducts(),
  ]);
  const productOptions = products.map((p) => ({ id: p.id, sku: p.sku, name: p.name }));

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/admin/qr?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="QR Generation"
        description="Generate Master → Small → Product QR batches and print sheets."
        actions={<GenerateBatchPanel products={productOptions} />}
      />

      <FilterBar placeholder="Search by serial range…" exportType="qr-batches" />

      <BatchesTable batches={result.items} products={productOptions} />

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        basePath={basePath}
      />
    </div>
  );
}
