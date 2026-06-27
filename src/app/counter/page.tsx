import { auth } from "@/auth";
import { listCounterKhatis } from "@/services/users";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { CounterKhatisTable } from "@/components/CounterKhatisTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";

export default async function CounterHome({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const result = await listCounterKhatis(session!.user.id, pagination, q || undefined);

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/counter?${fp.toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Karigars"
        description="Manage your registered karigars."
        actions={
          <CreateUserPanel allowedRoles={["khati"]} label="Create karigar" title="Register karigar" />
        }
      />

      <div className="space-y-3">
        <FilterBar placeholder="Search by name…" exportType="counter-khatis" />

        <CounterKhatisTable khatis={result.items} currentUserId={session!.user.id} />

        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          basePath={basePath}
        />
      </div>
    </div>
  );
}
