import { auth } from "@/auth";
import { listPendingForCounter } from "@/services/kyc";
import { KycCard } from "@/components/KycCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/Pagination";
import { parsePageParams } from "@/lib/pagination";

export default async function CounterKycPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const result = await listPendingForCounter(session!.user.id, { page: pagination.page, pageSize: pagination.pageSize, q: q || undefined });

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/counter/kyc?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Khati Approvals"
        description="Review and approve khati registration details submitted via their registration form."
      />

      <FilterBar placeholder="Search by name…" exportType="kyc" />

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="user-check"
            title="No pending approvals"
            description={
              q
                ? "No khatis match your search."
                : "When a khati submits their registration form, they will appear here."
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {result.items.map((k) => (
            <KycCard key={k.id} khati={k} />
          ))}
        </div>
      )}

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
