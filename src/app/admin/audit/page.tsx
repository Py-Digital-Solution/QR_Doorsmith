import { listAuditLogs } from "@/services/audit";
import { AuditLogTable } from "@/components/AuditLogTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/Pagination";
import { parsePageParams } from "@/lib/pagination";

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "kyc_approve", label: "KYC approve" },
  { value: "kyc_reject", label: "KYC reject" },
  { value: "user_create", label: "User created" },
  { value: "user_delete", label: "User deleted" },
  { value: "return_create", label: "Return" },
  { value: "redemption_settle", label: "Redemption settled" },
  { value: "dispatch_create", label: "Dispatch" },
];

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";
  const action = sp.action ?? "";

  const result = await listAuditLogs({
    page: pagination.page,
    pageSize: pagination.pageSize,
    q: q || undefined,
    action: action || undefined,
  });

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  if (action) fp.set("action", action);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/admin/audit?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Log"
        description="Complete trail of all admin actions, KYC decisions, and system events."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form method="GET" className="flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by actor name…"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
          />
          <select
            name="action"
            defaultValue={action}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Filter
          </button>
          {(q || action) && (
            <a
              href="/admin/audit"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </a>
          )}
        </form>
      </div>

      <AuditLogTable logs={result.items} />

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
