import { listBatches } from "@/services/qr";
import { listActiveProducts } from "@/services/products";
import { parsePageParams } from "@/lib/pagination";
import { GenerateBatchPanel } from "@/components/GenerateBatchPanel";
import { BatchesTable } from "@/components/BatchesTable";
import { Pagination } from "@/components/Pagination";

export default async function QrPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const pagination = parsePageParams(await searchParams);
  const [result, products] = await Promise.all([
    listBatches(pagination),
    listActiveProducts(),
  ]);
  const productOptions = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">QR Generation</h1>
          <p className="text-sm text-gray-500">
            Generate Master → Small → Product QR batches and print sheets.
          </p>
        </div>
        <GenerateBatchPanel products={productOptions} />
      </div>

      <BatchesTable batches={result.items} products={productOptions} />

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        basePath="/admin/qr"
      />
    </div>
  );
}
