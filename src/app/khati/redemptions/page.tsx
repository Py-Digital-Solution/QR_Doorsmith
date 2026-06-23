import { auth } from "@/auth";
import { getKhatiStats } from "@/services/khati";
import { listKhatiRedemptions } from "@/services/redemption";
import { getSetting } from "@/services/settings";
import { formatISTDate } from "@/lib/datetime";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { RedeemForm } from "@/components/RedeemForm";
import { Badge, statusTone } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function KhatiRedemptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";

  const [stats, redemptions, minPoints] = await Promise.all([
    getKhatiStats(session!.user.id),
    listKhatiRedemptions(session!.user.id, pagination),
    getSetting<number>("min_redemption_points", 0),
  ]);

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  const basePath = `/khati/redemptions?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Redemptions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Available: <span className="font-semibold text-brand">{stats.points} points</span>
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Request redemption</h2>
        <RedeemForm currentPoints={stats.points} minPoints={minPoints} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">History</h2>

        <FilterBar placeholder="Search…" exportType="khati-redemptions" />

        {redemptions.items.length === 0 ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white shadow-card">
            <EmptyState icon="coins" title="No redemptions yet" description="Your redemption requests will appear here." />
          </div>
        ) : (
          <>
            <div className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-card">
              {redemptions.items.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{r.points} points</p>
                      <p className="text-xs text-gray-400">{formatISTDate(r.createdAt)}</p>
                    </div>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </div>
                  {r.otp && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-light px-3 py-2">
                      <span className="text-xs font-medium text-gray-500">OTP:</span>
                      <span className="font-mono text-lg font-bold tracking-[0.2em] text-brand">{r.otp}</span>
                      <span className="ml-auto text-xs text-gray-400">Show to counter</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Pagination
                page={redemptions.page}
                pageCount={redemptions.pageCount}
                total={redemptions.total}
                pageSize={redemptions.pageSize}
                basePath={basePath}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
