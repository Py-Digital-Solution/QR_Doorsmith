"use client";

import { useState } from "react";
import { Star, PlayCircle, Package } from "lucide-react";
import { SlideOver } from "@/components/SlideOver";
import { ProductDetail } from "@/components/KhatiProductsClient";
import type { ProductDTO } from "@/services/products";

/**
 * Product tutorial cards on the karigar home. Clicking a card opens the product
 * detail (description + videos) directly in a drawer — no navigation, one tap.
 */
export function KhatiHomeProducts({ products }: { products: ProductDTO[] }) {
  const [selected, setSelected] = useState<ProductDTO | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => setSelected(product)}
            className="focus-ring rounded-lg border border-gray-200 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-light">
                <Package className="size-5 text-brand-dark" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{product.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-xs font-bold text-brand-dark">
                    <Star className="size-3" aria-hidden />
                    {product.rewardPoints} pts
                  </div>
                  {product.videoLinks.length > 0 && (
                    <div className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                      <PlayCircle className="size-3.5" aria-hidden />
                      {product.videoLinks.length} video{product.videoLinks.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                {product.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-gray-500">{product.description}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

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
