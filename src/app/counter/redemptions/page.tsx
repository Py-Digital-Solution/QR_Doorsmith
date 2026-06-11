import { auth } from "@/auth";
import { listCounterRedemptions } from "@/services/redemption";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { RedemptionActions } from "@/components/RedemptionActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabNav } from "@/components/ui/Tabs";
import { Badge, statusTone } from "@/components/ui/Badge";
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
  ].map((tab) => ({
    label: tab.label,
    href: tab.value
      ? `/counter/redemptions?status=${tab.value}`
      : "/counter/redemptions",
    active: (params.status ?? "") === tab.value,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redemption requests"
        description="Review and approve khati redemption requests."
      />

      {/* Status tabs */}
      <TabNav tabs={tabs} />

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="gift"
            title="No redemption requests found"
            description="Khati redemption requests will appear here."
          />
        </div>
      ) : (
        <>
          {/* Mobile */}
          <MobileCardList className="space-y-2">
            {result.items.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{r.khatiName}</p>
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
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  )}
                </div>
              </div>
            ))}
          </MobileCardList>

          {/* Desktop */}
          <TableWrapper>
            <Table>
              <THead>
                <TH>Khati</TH>
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
                      {r.khatiPhone && (
                        <p className="text-xs text-gray-400">{r.khatiPhone}</p>
                      )}
                    </TD>
                    <TD className="text-xs text-gray-500">
                      {r.createdAt.slice(0, 10)}
                    </TD>
                    <TD align="right" className="font-bold text-brand">
                      {r.points}
                    </TD>
                    <TD>
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </TD>
                    <TD>
                      {r.status === "pending" ? (
                        <RedemptionActions id={r.id} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
            basePath={statusFilter ? `/counter/redemptions?status=${statusFilter}` : "/counter/redemptions"}
          />
        </>
      )}
    </div>
  );
}
