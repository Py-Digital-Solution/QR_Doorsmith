import { auth } from "@/auth";
import Link from "next/link";
import { getKhatiStats, listKhatiScans } from "@/services/khati";

export default async function KhatiHome() {
  const session = await auth();
  const [stats, scans] = await Promise.all([
    getKhatiStats(session!.user.id),
    listKhatiScans(session!.user.id, { page: 1, pageSize: 5 }),
  ]);

  return (
    <div className="space-y-6">
      {/* Points balance */}
      <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/5 to-brand/10 p-6 text-center">
        <p className="text-sm text-gray-500">Available points</p>
        <p className="text-5xl font-bold text-brand">{stats.points}</p>
        <p className="mt-1 text-xs text-gray-400">
          Lifetime earned: <span className="font-medium text-gray-600">{stats.lifetimePoints}</span>
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/khati/scan"
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-brand bg-white py-5 text-center transition-shadow hover:shadow-md"
        >
          <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.625 3.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
          </svg>
          <span className="text-sm font-semibold text-brand">Scan QR</span>
        </Link>

        <Link
          href="/khati/redemptions"
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-5 text-center transition-shadow hover:shadow-md"
        >
          <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">Redeem</span>
        </Link>
      </div>

      {/* Recent scans */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent scans</h2>
          {scans.total > 5 && (
            <Link href="/khati/history" className="text-xs text-brand-dark hover:underline">
              View all →
            </Link>
          )}
        </div>

        {scans.items.length === 0 ? (
          <p className="text-sm text-gray-400">No scans yet. Scan a product QR to earn points!</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {scans.items.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-mono text-xs font-medium">{s.serialNo}</p>
                  {s.sku && <p className="text-xs text-gray-400">{s.sku}</p>}
                  <p className="text-xs text-gray-400">{s.scannedAt.slice(0, 10)}</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-bold text-green-700">
                  +{s.pointsEarned}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
