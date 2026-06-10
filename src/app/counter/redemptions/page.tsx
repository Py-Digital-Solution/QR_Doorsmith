import { auth } from "@/auth";
import { listCounterRedemptions } from "@/services/redemption";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { RedemptionActions } from "@/components/RedemptionActions";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-500",
};

export default async function CounterRedemptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const pagination = parsePageParams(params);
  const statusFilter = ["pending", "approved", "rejected"].includes(params.status ?? "")
    ? params.status
    : undefined;

  const result = await listCounterRedemptions(
    session!.user.id,
    pagination,
    { status: statusFilter },
  );

  const tabs = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Redemption requests</h1>
        <p className="text-sm text-gray-500">Review and approve khati redemption requests.</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const active = (params.status ?? "") === tab.value;
          const href = tab.value
            ? `/counter/redemptions?status=${tab.value}`
            : "/counter/redemptions";
          return (
            <a
              key={tab.value}
              href={href}
              className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-brand text-brand"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      {result.items.length === 0 ? (
        <p className="text-sm text-gray-400">No redemption requests found.</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2 sm:hidden">
            {result.items.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.khatiName}</p>
                    {r.khatiPhone && (
                      <p className="text-xs text-gray-400">{r.khatiPhone}</p>
                    )}
                    <p className="text-xs text-gray-400">{r.createdAt.slice(0, 10)}</p>
                  </div>
                  <p className="text-xl font-bold text-brand">{r.points} pts</p>
                </div>
                <div className="mt-3">
                  {r.status === "pending" ? (
                    <RedemptionActions id={r.id} />
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {r.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Khati</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Points</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">
                      <p className="font-medium">{r.khatiName}</p>
                      {r.khatiPhone && (
                        <p className="text-xs text-gray-400">{r.khatiPhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {r.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-brand">{r.points}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-500"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {r.status === "pending" ? (
                        <RedemptionActions id={r.id} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
            basePath={statusFilter ? `/counter/redemptions?status=${statusFilter}` : "/counter/redemptions"}
          />
        </>
      )}
    </div>
  );
}
