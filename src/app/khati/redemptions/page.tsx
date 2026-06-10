import { auth } from "@/auth";
import { getKhatiStats } from "@/services/khati";
import { listKhatiRedemptions } from "@/services/redemption";
import { getSetting } from "@/services/settings";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { RedeemForm } from "@/components/RedeemForm";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-500",
};

export default async function KhatiRedemptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const pagination = parsePageParams(await searchParams);
  const [stats, redemptions, minPoints] = await Promise.all([
    getKhatiStats(session!.user.id),
    listKhatiRedemptions(session!.user.id, pagination),
    getSetting<number>("min_redemption_points", 0),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Redemptions</h1>
        <p className="text-sm text-gray-500">
          Available: <span className="font-semibold text-brand">{stats.points} points</span>
        </p>
      </div>

      {/* Redeem form */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Request redemption</h2>
        <RedeemForm currentPoints={stats.points} minPoints={minPoints} />
      </div>

      {/* History */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">History</h2>
        {redemptions.items.length === 0 ? (
          <p className="text-sm text-gray-400">No redemptions yet.</p>
        ) : (
          <>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {redemptions.items.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{r.points} points</p>
                    <p className="text-xs text-gray-400">{r.createdAt.slice(0, 10)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-500"}`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
            <Pagination
              page={redemptions.page}
              pageCount={redemptions.pageCount}
              total={redemptions.total}
              pageSize={redemptions.pageSize}
              basePath="/khati/redemptions"
            />
          </>
        )}
      </div>
    </div>
  );
}
