import { listProducts } from "@/services/products";
import { parsePageParams } from "@/lib/pagination";
import { ProductCreatePanel } from "@/components/ProductCreatePanel";
import { ProductsTable } from "@/components/ProductsTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const result = await listProducts(pagination, q || undefined);

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/admin/products?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="SKUs, pricing and reward points used to generate QR codes."
        actions={<ProductCreatePanel />}
      />

      <FilterBar placeholder="Search by name or SKU…" exportType="products" />

      <ProductsTable products={result.items} />

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
