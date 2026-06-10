import { auth } from "@/auth";
import Link from "next/link";
import { listUsers } from "@/services/users";
import { getCounterInventory } from "@/services/dispatch";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { UsersTable } from "@/components/UsersTable";
import { Pagination } from "@/components/Pagination";

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-brand-dark">{value}</p>
    </Link>
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
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-500">Your counter overview.</p>
      </div>

      {/* Inventory summary — clicking goes to full inventory */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Inventory</h2>
          <Link
            href="/counter/inventory"
            className="text-xs text-brand-dark hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Master boxes"
            value={inventory.masters}
            href="/counter/inventory?type=master"
          />
          <StatCard
            label="Small boxes"
            value={inventory.smalls}
            href="/counter/inventory?type=small"
          />
          <StatCard
            label="Products"
            value={inventory.products}
            href="/counter/inventory?type=product"
          />
          <StatCard
            label="Total codes"
            value={inventory.total}
            href="/counter/inventory"
          />
        </div>
      </div>

      {/* Khatis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Khatis</h2>
            <p className="text-sm text-gray-500">Khatis registered at your counter.</p>
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
