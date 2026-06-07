import { auth } from "@/auth";
import { listUsers } from "@/services/users";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { UsersTable } from "@/components/UsersTable";
import { Pagination } from "@/components/Pagination";

export default async function SalesHome({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const pagination = parsePageParams(await searchParams);
  const result = await listUsers(
    { role: "counter", createdBy: session!.user.id },
    pagination,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Counters</h1>
          <p className="text-sm text-gray-500">
            The retail counters in your network.
          </p>
        </div>
        <CreateUserPanel
          allowedRoles={["counter"]}
          label="Create counter"
          title="Create counter"
        />
      </div>

      <UsersTable users={result.items} currentUserId={session!.user.id} />

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        basePath="/sales"
      />
    </div>
  );
}
