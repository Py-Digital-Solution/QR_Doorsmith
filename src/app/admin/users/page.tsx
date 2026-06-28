import Link from "next/link";
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
import type { UserRole } from "@/models/User";

const ROLE_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Admin", value: "admin" },
  { label: "Sales Rep", value: "sales_rep" },
  { label: "Distributor", value: "distributor" },
  { label: "Counter", value: "counter" },
  { label: "Karigar", value: "khati" },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; role?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";
  const role = (sp.role ?? "") as UserRole | "";

  const [result, distributorEnabled, counters] = await Promise.all([
    listUsers({ search: q || undefined, role: role || undefined }, pagination),
    isDistributorEnabled(),
    listCounters(),
  ]);
  const allowedRoles = distributorEnabled
    ? CAN_CREATE.admin
    : CAN_CREATE.admin.filter((r) => r !== "distributor");

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  if (role) fp.set("role", role);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/admin/users?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="All accounts across the network."
        actions={<CreateUserPanel allowedRoles={allowedRoles} counters={counters} />}
      />

      {/* Role bubble filters */}
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((f) => {
          const active = role === f.value;
          const href = f.value
            ? `/admin/users?role=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
            : `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`;
          return (
            <Link
              key={f.value}
              href={href}
              scroll={false}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

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
