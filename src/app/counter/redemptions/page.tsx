import { auth } from "@/auth";
import { listCounterRedemptions } from "@/services/redemption";
import { getCounterRedemptionSummary } from "@/services/settlement";
import { parsePageParams } from "@/lib/pagination";
import { formatISTDate } from "@/lib/datetime";
import { Pagination } from "@/components/Pagination";
import { RedemptionActions } from "@/components/RedemptionActions";
import { RedeemByOtp } from "@/components/RedeemByOtp";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabNav } from "@/components/ui/Tabs";
import { Badge, statusTone } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import {
  TableWrapper,
  Table,
  THead,
  TH,
  TR,
  TD,
  MobileCardList,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CounterRedemptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; status?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const pagination = parsePageParams(sp);
  const q = sp.q ?? "";
  const statusFilter = ["pending", "approved", "rejected"].includes(sp.status ?? "")
    ? sp.status
    : undefined;

  const result = await listCounterRedemptions(
    session!.user.id,
    pagination,
    { status: statusFilter, search: q || undefined },
  );

  const summary = await getCounterRedemptionSummary(session!.user.id);

  const tabs = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ].map((tab) => ({
    label: tab.label,
    href: tab.value ? `/counter/redemptions?status=${tab.value}` : "/counter/redemptions",
    active: (sp.status ?? "") === tab.value,
  }));

  const fp = new URLSearchParams();
  if (q) fp.set("q", q);
  fp.set("pageSize", String(pagination.pageSize));
  if (statusFilter) fp.set("status", statusFilter);
  const basePath = `/counter/redemptions?${fp.toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Redemption requests" description="Review and approve karigar redemption requests." />

      {/* Total redemption points this counter has paid out */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-brand/20 bg-brand-light p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark/70">Total redeemed</p>
          <p className="mt-1.5 text-2xl font-bold text-brand-dark">{summary.totalPoints.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-brand-dark/60">{summary.totalCount} redemption{summary.totalCount === 1 ? "" : "s"} done</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Settled</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{summary.settledPoints.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-gray-500">reimbursed by admin</p>
        </div>
        <div className="col-span-2 rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-card sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Pending settlement</p>
          <p className="mt-1.5 text-2xl font-bold text-orange-700">{summary.outstandingPoints.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-orange-600">{summary.outstandingCount} awaiting admin</p>
        </div>
      </div>

      <RedeemByOtp />

      <TabNav tabs={tabs} />

      <FilterBar placeholder="Search by karigar name…" exportType="counter-redemptions" />

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState icon="gift" title="No redemption requests found" description="Karigar redemption requests will appear here." />
        </div>
      ) : (
        <>
          <MobileCardList className="space-y-2">
            {result.items.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{r.khatiName}</p>
                    {r.khatiPhone && <p className="text-xs text-gray-400">{r.khatiPhone}</p>}
                    <p className="text-xs text-gray-400">{formatISTDate(r.createdAt)}</p>
                  </div>
                  <p className="text-xl font-bold text-brand">{r.points} pts</p>
                </div>
                <div className="mt-3">
                  {r.status === "pending" ? <RedemptionActions id={r.id} /> : <Badge tone={statusTone(r.status)}>{r.status}</Badge>}
                </div>
              </div>
            ))}
          </MobileCardList>

          <TableWrapper>
            <Table>
              <THead>
                <TH>Karigar</TH>
                <TH>Date</TH>
                <TH align="right">Points</TH>
                <TH>Status</TH>
                <TH>Action</TH>
              </THead>
              <tbody>
                {result.items.map((r) => (
                  <TR key={r.id} interactive>
                    <TD>
                      <p className="font-medium text-gray-900">{r.khatiName}</p>
                      {r.khatiPhone && <p className="text-xs text-gray-400">{r.khatiPhone}</p>}
                    </TD>
                    <TD className="text-xs text-gray-500">{formatISTDate(r.createdAt)}</TD>
                    <TD align="right" className="font-bold text-brand">{r.points}</TD>
                    <TD><Badge tone={statusTone(r.status)}>{r.status}</Badge></TD>
                    <TD>
                      {r.status === "pending" ? <RedemptionActions id={r.id} /> : <span className="text-xs text-gray-400"></span>}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
            basePath={basePath}
          />
        </>
      )}
    </div>
  );
}
