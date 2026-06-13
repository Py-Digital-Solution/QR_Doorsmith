import { auth } from "@/auth";
import { listUsers } from "@/services/users";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { UsersTable } from "@/components/UsersTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";

export default async function SalesHome({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const result = await listUsers(
    { role: "counter", createdBy: session!.user.id, search: q || undefined },
    pagination,
  );

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/sales?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Counters"
        description="The retail counters in your network."
        actions={
          <CreateUserPanel
            allowedRoles={["counter"]}
            label="Create counter"
            title="Create counter"
          />
        }
      />

      <FilterBar placeholder="Search by name…" exportType="sales-counters" />

      <UsersTable users={result.items} currentUserId={session!.user.id} />

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        basePath={basePath}
      />
    </div>
  );
}
