import { auth } from "@/auth";
import { listUsers, listCounters } from "@/services/users";
import { isDistributorEnabled } from "@/services/settings";
import { CAN_CREATE } from "@/lib/rbac";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { UsersTable } from "@/components/UsersTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const [result, distributorEnabled, counters] = await Promise.all([
    listUsers({ search: q || undefined }, pagination),
    isDistributorEnabled(),
    listCounters(),
  ]);
  const allowedRoles = distributorEnabled
    ? CAN_CREATE.admin
    : CAN_CREATE.admin.filter((r) => r !== "distributor");

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/admin/users?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="All accounts across the network."
        actions={<CreateUserPanel allowedRoles={allowedRoles} counters={counters} />}
      />

      <FilterBar placeholder="Search by name…" exportType="users" />

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
