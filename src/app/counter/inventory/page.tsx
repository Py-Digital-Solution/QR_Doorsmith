import { auth } from "@/auth";
import Link from "next/link";
import { getCounterInventory, listCounterCodes } from "@/services/dispatch";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { QR_TYPES, type QrType } from "@/lib/qr";

const TYPE_LABEL: Record<QrType, string> = {
  master: "Master box",
  small: "Small box",
  product: "Product",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  scanned: "bg-blue-100 text-blue-700",
  disabled: "bg-red-100 text-red-500",
  returned: "bg-yellow-100 text-yellow-700",
  reactivated: "bg-purple-100 text-purple-700",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-brand-dark">{value}</p>
    </div>
  );
}

export default async function CounterInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const pagination = parsePageParams(params);
  const typeFilter = (QR_TYPES as readonly string[]).includes(params.type ?? "")
    ? (params.type as QrType)
    : undefined;

  const [inventory, codes] = await Promise.all([
    getCounterInventory(session!.user.id),
    listCounterCodes(session!.user.id, pagination, { type: typeFilter }),
  ]);

  const tabs = [
    { label: "All", value: "" },
    { label: "Master", value: "master" },
    { label: "Small", value: "small" },
    { label: "Product", value: "product" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Inventory</h1>
        <p className="text-sm text-gray-500">All QR codes dispatched to your counter.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Master boxes" value={inventory.masters} />
        <Stat label="Small boxes" value={inventory.smalls} />
        <Stat label="Products" value={inventory.products} />
        <Stat label="Total codes" value={inventory.total} />
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const active = (params.type ?? "") === tab.value;
          const href = tab.value
            ? `/counter/inventory?type=${tab.value}`
            : "/counter/inventory";
          return (
            <Link
              key={tab.value}
              href={href}
              className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-brand text-brand"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Code list */}
      {codes.items.length === 0 ? (
        <p className="text-sm text-gray-500">No codes dispatched yet.</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2 sm:hidden">
            {codes.items.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">{c.serialNo}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-500"}`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-gray-500">
                  <span>{TYPE_LABEL[c.type as QrType] ?? c.type}</span>
                  {c.sku && <span>{c.sku}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Serial No</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {codes.items.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{c.serialNo}</td>
                    <td className="px-4 py-2 text-xs">
                      {TYPE_LABEL[c.type as QrType] ?? c.type}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{c.sku || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-500"}`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={codes.page}
            pageCount={codes.pageCount}
            total={codes.total}
            pageSize={codes.pageSize}
            basePath={typeFilter ? `/counter/inventory?type=${typeFilter}` : "/counter/inventory"}
          />
        </>
      )}
    </div>
  );
}
