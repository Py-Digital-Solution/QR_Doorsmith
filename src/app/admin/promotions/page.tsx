import { listBroadcasts, AUDIENCE_LABEL, type AudienceRole } from "@/services/broadcast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatISTDate } from "@/lib/datetime";
import { PromotionForm } from "./PromotionForm";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "gray" | "yellow" | "green"> = {
  queued: "gray",
  sending: "yellow",
  completed: "green",
};

export default async function PromotionsPage() {
  const broadcasts = await listBroadcasts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions"
        description="Send a WhatsApp promotional message to your audiences."
      />

      <PromotionForm />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent broadcasts</h2>
        {broadcasts.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-card">
            <EmptyState icon="inbox" title="No broadcasts yet" description="Your sent promotions will appear here." />
          </div>
        ) : (
          <div className="space-y-2">
            {broadcasts.map((b) => {
              const pct = b.total > 0 ? Math.round(((b.sent + b.failed) / b.total) * 100) : 0;
              return (
                <div key={b.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[b.status] ?? "gray"}>{b.status}</Badge>
                        {b.audienceRoles.map((r) => (
                          <span key={r} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {AUDIENCE_LABEL[r as AudienceRole] ?? r}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm text-gray-700">{b.message}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-gray-500">
                      <p className="font-medium text-gray-700">{b.sent}/{b.total} sent</p>
                      {b.failed > 0 && <p className="text-red-500">{b.failed} failed</p>}
                      <p className="mt-0.5">{formatISTDate(new Date(b.createdAt))}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${b.status === "completed" ? "bg-green-500" : "bg-brand"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
