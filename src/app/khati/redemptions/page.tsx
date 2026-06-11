import { auth } from "@/auth";
import { getKhatiStats } from "@/services/khati";
import { listKhatiRedemptions } from "@/services/redemption";
import { getSetting } from "@/services/settings";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { RedeemForm } from "@/components/RedeemForm";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

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
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Redemptions
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Available:{" "}
          <span className="font-semibold text-brand">{stats.points} points</span>
        </p>
      </div>

      {/* Redeem form */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Request redemption</h2>
        <RedeemForm currentPoints={stats.points} minPoints={minPoints} />
      </div>

      {/* History */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">History</h2>
        {redemptions.items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-card">
            <EmptyState
              icon="coins"
              title="No redemptions yet"
              description="Your redemption requests will appear here."
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-card">
              {redemptions.items.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.points} points</p>
                    <p className="text-xs text-gray-400">{r.createdAt.slice(0, 10)}</p>
                  </div>
                  <Badge tone={statusTone(r.status)}>{r.status}</Badge>
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
