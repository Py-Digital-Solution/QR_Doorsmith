import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listActiveProducts } from "@/services/products";
import { PlayCircle, ExternalLink, Package, Tag, IndianRupee, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

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

export default async function KhatiProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/khati");

  const products = await listActiveProducts();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Products</h1>
        <p className="mt-1 text-sm text-gray-500">
          All DoorSmith products — scan QR codes to earn reward points.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="package"
            title="No products yet"
            description="Products added by your admin will appear here."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card"
            >
              {/* ── Product header ── */}
              <div className="flex items-start gap-3 px-4 py-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-light">
                  <Package className="size-6 text-brand-dark" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <Tag className="size-3" aria-hidden />
                        {product.sku}
                      </p>
                    </div>
                    {/* Points badge */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-dark">
                      <Star className="size-3" aria-hidden />
                      {product.rewardPoints} pts
                    </span>
                  </div>

                  {product.description && (
                    <p className="mt-2 text-sm text-gray-600">{product.description}</p>
                  )}
                </div>
              </div>

              {/* ── Price row ── */}
              <div className="flex items-center gap-6 border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                <div className="flex items-center gap-1 text-sm">
                  <IndianRupee className="size-3.5 text-gray-400" aria-hidden />
                  <span className="font-semibold text-gray-900">{product.mrp.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-gray-400">MRP</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <IndianRupee className="size-3.5 text-green-500" aria-hidden />
                  <span className="font-semibold text-green-700">{product.salesPrice.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-gray-400">Sale price</span>
                </div>
                {product.mrp > product.salesPrice && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                    {Math.round(((product.mrp - product.salesPrice) / product.mrp) * 100)}% off
                  </span>
                )}
              </div>

              {/* ── Video tutorials ── */}
              {product.videoLinks.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3">
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
          ))}
        </div>
      )}
    </div>
  );
}
