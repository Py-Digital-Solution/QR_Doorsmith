import { auth } from "@/auth";
import { listUsers } from "@/services/users";
import { isDistributorEnabled } from "@/services/settings";
import { CAN_CREATE } from "@/lib/rbac";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { UsersTable } from "@/components/UsersTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const pagination = parsePageParams(await searchParams);
  const [result, distributorEnabled] = await Promise.all([
    listUsers({}, pagination),
    isDistributorEnabled(),
  ]);
  const allowedRoles = distributorEnabled
    ? CAN_CREATE.admin
    : CAN_CREATE.admin.filter((r) => r !== "distributor");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="All accounts across the network."
        actions={<CreateUserPanel allowedRoles={allowedRoles} />}
      />

      <UsersTable users={result.items} currentUserId={session!.user.id} />

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        basePath="/admin/users"
      />
    </div>
  );
}
