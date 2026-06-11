import { listProducts } from "@/services/products";
import { parsePageParams } from "@/lib/pagination";
import { ProductCreatePanel } from "@/components/ProductCreatePanel";
import { ProductsTable } from "@/components/ProductsTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const pagination = parsePageParams(await searchParams);
  const result = await listProducts(pagination);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="SKUs, pricing and reward points used to generate QR codes."
        actions={<ProductCreatePanel />}
      />

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
