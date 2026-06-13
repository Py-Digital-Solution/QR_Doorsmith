import { auth } from "@/auth";
import Link from "next/link";
import { listUsers } from "@/services/users";
import { getCounterInventory } from "@/services/dispatch";
import { parsePageParams } from "@/lib/pagination";
import { CreateUserPanel } from "@/components/CreateUserPanel";
import { UsersTable } from "@/components/UsersTable";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { ICONS, type IconName } from "@/components/ui/icons";

function StatCard({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: IconName;
}) {
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      className="focus-ring rounded-lg border border-gray-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          {label}
        </p>
        <span className="flex size-8 items-center justify-center rounded-md bg-brand-light text-brand-dark">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-brand-dark">{value}</p>
    </Link>
  );
}

export default async function CounterHome({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const [result, inventory] = await Promise.all([
    listUsers({ role: "khati", createdBy: session!.user.id, search: q || undefined }, pagination),
    getCounterInventory(session!.user.id),
  ]);

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/counter?${fp.toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Your counter overview." />

      {/* Inventory summary */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Inventory</h2>
          <Link href="/counter/inventory" className="text-xs font-medium text-brand-dark hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Master boxes" value={inventory.masters} href="/counter/inventory?type=master" icon="boxes" />
          <StatCard label="Small boxes" value={inventory.smalls} href="/counter/inventory?type=small" icon="package" />
          <StatCard label="Products" value={inventory.products} href="/counter/inventory?type=product" icon="qr-code" />
          <StatCard label="Total codes" value={inventory.total} href="/counter/inventory" icon="dashboard" />
        </div>
      </div>

      {/* Khatis */}
      <div className="space-y-3">
        <PageHeader
          title="Khatis"
          description="Khatis registered at your counter."
          actions={
            <CreateUserPanel allowedRoles={["khati"]} label="Create khati" title="Register khati" />
          }
        />

        <FilterBar placeholder="Search by name…" exportType="counter-khatis" />

        <UsersTable users={result.items} currentUserId={session!.user.id} />

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
