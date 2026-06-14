import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listProducts } from "@/services/products";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { KhatiProductsClient } from "@/components/KhatiProductsClient";

export default async function KhatiProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login/khati");

  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const result = await listProducts(pagination, q || undefined, "active");

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/khati/products?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Products</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse all DoorSmith products. Tap a row to view details and reward points.
        </p>
      </div>

      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-gray-100" />}>
        <KhatiProductsClient products={result.items} initialQ={q} />
      </Suspense>

      {result.pageCount > 1 && (
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          basePath={basePath}
        />
      )}
    </div>
  );
}
