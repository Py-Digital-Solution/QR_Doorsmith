import { auth } from "@/auth";
import { listPendingForAdmin, listPendingForSalesRep } from "@/services/kyc";
import { KycCard } from "@/components/KycCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/Pagination";
import { parsePageParams } from "@/lib/pagination";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const role = session!.user.role;
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const opts = { page: pagination.page, pageSize: pagination.pageSize, q: q || undefined };
  const result =
    role === "admin"
      ? await listPendingForAdmin(opts)
      : await listPendingForSalesRep(session!.user.id, opts);

  const title = role === "admin" ? "Khati Approvals" : "Khati Registrations";
  const description =
    role === "admin"
      ? "Review and approve khati registrations submitted from the field."
      : "Khatis registered under your counters awaiting admin approval. View only.";

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/approvals?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} />

      <FilterBar placeholder="Search by name…" exportType="kyc" />

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="user-check"
            title="No pending approvals"
            description={
              q
                ? "No khatis match your search."
                : "Khatis approved by counters will appear here for your review."
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {result.items.map((k) => (
            <KycCard key={k.id} khati={k} showStatus readOnly={role !== "admin"} />
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
