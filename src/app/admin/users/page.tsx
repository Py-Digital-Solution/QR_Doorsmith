import { auth } from "@/auth";
import { listUsers } from "@/services/users";
import { isDistributorEnabled } from "@/services/settings";
import { CAN_CREATE } from "@/lib/rbac";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { UsersTable } from "@/components/UsersTable";
import { Pagination } from "@/components/Pagination";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Users</h1>
          <p className="text-sm text-gray-500">All accounts across the network.</p>
        </div>
        <CreateUserPanel allowedRoles={allowedRoles} />
      </div>

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
