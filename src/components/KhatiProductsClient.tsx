"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Package, IndianRupee, Star, PlayCircle, ExternalLink } from "lucide-react";
import { SlideOver } from "@/components/SlideOver";
import type { ProductDTO } from "@/services/products";

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function ProductDetail({ product }: { product: ProductDTO }) {
  const discount =
    product.mrp > product.salesPrice
      ? Math.round(((product.mrp - product.salesPrice) / product.mrp) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-light">
          <Package className="size-6 text-brand-dark" aria-hidden />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{product.name}</p>
          <p className="mt-0.5 text-xs text-gray-400">SKU: {product.sku}</p>
        </div>
      </div>

      {/* Points badge */}
      <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-4 py-1.5 text-sm font-bold text-brand-dark">
        <Star className="size-4" aria-hidden />
        {product.rewardPoints} reward points
      </div>

      {/* Pricing */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Pricing</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">MRP</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-gray-900">
              <IndianRupee className="size-3.5" aria-hidden />
              {product.mrp.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Sale price</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-green-700">
              <IndianRupee className="size-3.5 text-green-500" aria-hidden />
              {product.salesPrice.toLocaleString("en-IN")}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-2">
              <span className="text-sm text-gray-500">Discount</span>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                {discount}% off
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Description</p>
          <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
        </div>
      )}

      {/* Videos */}
      {product.videoLinks.length > 0 && (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <PlayCircle className="size-3.5" aria-hidden />
            Installation &amp; tutorials
          </p>
          <div className="space-y-3">
            {product.videoLinks.map((url, idx) => {
              const embedUrl = getYouTubeEmbedUrl(url);
              return (
                <div key={idx}>
                  {embedUrl ? (
                    <div
                      className="relative overflow-hidden rounded-lg bg-black"
                      style={{ paddingBottom: "56.25%" }}
                    >
                      <iframe
                        src={embedUrl}
                        title={`${product.name} — video ${idx + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full"
                      />
                    </div>
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 hover:bg-brand-light hover:text-brand-dark"
                    >
                      <PlayCircle className="size-5 shrink-0 text-brand" aria-hidden />
                      <span className="flex-1 truncate">{url}</span>
                      <ExternalLink className="size-4 shrink-0 text-gray-400" aria-hidden />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function KhatiProductsClient({
  products,
  initialQ,
}: {
  products: ProductDTO[];
  initialQ: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ);
  const [selected, setSelected] = useState<ProductDTO | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      params.set("page", "1");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or SKU…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Package className="size-8 text-gray-300" aria-hidden />
            <p className="text-sm font-medium text-gray-500">No products found</p>
            {q && <p className="text-xs text-gray-400">Try a different search term</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">MRP</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Sale Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr
                  key={product.id}
                  onClick={() => setSelected(product)}
                  className="cursor-pointer transition-colors hover:bg-brand-light/40"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{product.sku}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-gray-600 sm:table-cell">
                    ₹{product.mrp.toLocaleString("en-IN")}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-medium text-green-700 sm:table-cell">
                    ₹{product.salesPrice.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-bold text-brand-dark">
                      <Star className="size-3" aria-hidden />
                      {product.rewardPoints}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Product detail drawer */}
      <SlideOver
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Product details"}
      >
        {selected && <ProductDetail product={selected} />}
      </SlideOver>
    </>
  );
}
