import { auth } from "@/auth";
import { listUsers } from "@/services/users";
import { getCounterInventory } from "@/services/dispatch";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { UsersTable } from "@/components/UsersTable";
import { Pagination } from "@/components/Pagination";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-brand-dark">{value}</p>
    </div>
  );
}

export default async function CounterHome({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const pagination = parsePageParams(await searchParams);
  const [result, inventory] = await Promise.all([
    listUsers({ role: "khati", createdBy: session!.user.id }, pagination),
    getCounterInventory(session!.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">My inventory</h1>
        <p className="text-sm text-gray-500">Stock dispatched to your counter.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Master boxes" value={inventory.masters} />
        <Stat label="Small boxes" value={inventory.smalls} />
        <Stat label="Products" value={inventory.products} />
        <Stat label="Total codes" value={inventory.total} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Khatis</h2>
            <p className="text-sm text-gray-500">
              Khatis registered at your counter.
            </p>
          </div>
          <CreateUserPanel
            allowedRoles={["khati"]}
            label="Create khati"
            title="Register khati"
          />
        </div>

        <UsersTable users={result.items} currentUserId={session!.user.id} />

        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          basePath="/counter"
        />
      </div>
    </div>
  );
}
