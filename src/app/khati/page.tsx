import { auth } from "@/auth";
import Link from "next/link";
import { ScanLine, Coins, ChevronRight } from "lucide-react";
import { getKhatiStats, listKhatiScans } from "@/services/khati";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function KhatiHome() {
  const session = await auth();
  const [stats, scans] = await Promise.all([
    getKhatiStats(session!.user.id),
    listKhatiScans(session!.user.id, { page: 1, pageSize: 5 }),
  ]);

  return (
    <div className="space-y-6">
      {/* Points balance */}
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/5 via-brand/10 to-brand/15 p-6 text-center shadow-card">
        <div className="absolute -top-10 -right-10 size-32 rounded-full bg-brand/10" aria-hidden />
        <div className="absolute -bottom-12 -left-12 size-36 rounded-full bg-brand/5" aria-hidden />
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          Available points
        </p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-brand">
          {stats.points}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Lifetime earned:{" "}
          <span className="font-medium text-gray-600">{stats.lifetimePoints}</span>
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/khati/scan"
          className="focus-ring flex flex-col items-center gap-2 rounded-xl border-2 border-brand bg-white py-5 text-center shadow-card transition-shadow hover:shadow-card-hover"
        >
          <ScanLine className="size-8 text-brand" strokeWidth={1.5} aria-hidden />
          <span className="text-sm font-semibold text-brand">Scan QR</span>
        </Link>

        <Link
          href="/khati/redemptions"
          className="focus-ring flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-5 text-center shadow-card transition-shadow hover:shadow-card-hover"
        >
          <Coins className="size-8 text-gray-500" strokeWidth={1.5} aria-hidden />
          <span className="text-sm font-semibold text-gray-700">Redeem</span>
        </Link>
      </div>

      {/* Recent scans */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent scans</h2>
          {scans.total > 5 && (
            <Link
              href="/khati/history"
              className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-dark hover:underline"
            >
              View all
              <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>

        {scans.items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-card">
            <EmptyState
              icon="scan"
              title="No scans yet"
              description="Scan a product QR to earn points!"
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-card">
            {scans.items.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-mono text-xs font-medium text-gray-900">{s.serialNo}</p>
                  {s.sku && <p className="text-xs text-gray-400">{s.sku}</p>}
                  <p className="text-xs text-gray-400">{s.scannedAt.slice(0, 10)}</p>
                  {s.returned && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-inset ring-red-200">
                      Returned
                    </span>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ring-1 ring-inset ${
                  s.returned
                    ? "bg-red-50 text-red-600 ring-red-200"
                    : "bg-green-50 text-green-700 ring-green-600/20"
                }`}>
                  {s.returned ? `−${s.pointsEarned}` : `+${s.pointsEarned}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
