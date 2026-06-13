import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listActiveProducts } from "@/services/products";
import { PlayCircle, ExternalLink, Package } from "lucide-react";
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

function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

export default async function KhatiProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/khati");

  const products = await listActiveProducts();
  const withVideos = products.filter((p) => p.videoLinks.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Product Tutorials
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Watch installation and usage videos for products you earn points on.
        </p>
      </div>

      {withVideos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="play-circle"
            title="No tutorials yet"
            description="Product tutorial videos will appear here once added by your admin."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {withVideos.map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-card"
            >
              {/* Product header */}
              <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light">
                  <Package className="size-5 text-brand" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.sku}</p>
                  {product.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-dark">
                  {product.rewardPoints} pts
                </span>
              </div>

              {/* Videos */}
              <div className="divide-y divide-gray-50">
                {product.videoLinks.map((url, idx) => {
                  const embedUrl = getYouTubeEmbedUrl(url);
                  return (
                    <div key={idx} className="p-4">
                      {embedUrl ? (
                        <div className="relative overflow-hidden rounded-lg bg-black" style={{ paddingBottom: "56.25%" }}>
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
                          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-brand-light hover:text-brand-dark"
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
          ))}
        </div>
      )}
    </div>
  );
}
