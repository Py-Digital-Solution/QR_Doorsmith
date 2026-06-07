import { listProducts } from "@/services/products";
import { parsePageParams } from "@/lib/pagination";
import { ProductCreatePanel } from "@/components/ProductCreatePanel";
import { ProductsTable } from "@/components/ProductsTable";
import { Pagination } from "@/components/Pagination";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const pagination = parsePageParams(await searchParams);
  const result = await listProducts(pagination);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Products</h1>
          <p className="text-sm text-gray-500">
            SKUs, pricing and reward points used to generate QR codes.
          </p>
        </div>
        <ProductCreatePanel />
      </div>

      <ProductsTable products={result.items} />

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        basePath="/admin/products"
      />
    </div>
  );
}
