import { auth } from "@/auth";
import { getCounterInventory, listCounterCodes } from "@/services/dispatch";
import { parsePageParams } from "@/lib/pagination";
import { Pagination } from "@/components/Pagination";
import { QR_TYPES, type QrType } from "@/lib/qr";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { TabNav } from "@/components/ui/Tabs";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
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

const TYPE_LABEL: Record<QrType, string> = {
  master: "Master box",
  small: "Small box",
  product: "Product",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "green",
  inactive: "gray",
  scanned: "blue",
  disabled: "red",
  returned: "yellow",
  reactivated: "brand",
};

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
  ].map((tab) => ({
    label: tab.label,
    href: tab.value ? `/counter/inventory?type=${tab.value}` : "/counter/inventory",
    active: (params.type ?? "") === tab.value,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="All QR codes dispatched to your counter."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Master boxes" value={inventory.masters} icon="boxes" tone="brand" />
        <StatCard label="Small boxes" value={inventory.smalls} icon="package" tone="brand" />
        <StatCard label="Products" value={inventory.products} icon="qr-code" tone="brand" />
        <StatCard label="Total codes" value={inventory.total} icon="dashboard" tone="brand" />
      </div>

      {/* Type filter tabs */}
      <TabNav tabs={tabs} />

      {/* Code list */}
      {codes.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-card">
          <EmptyState
            icon="boxes"
            title="No codes dispatched yet"
            description="Stock dispatched to your counter will appear here."
          />
        </div>
      ) : (
        <>
          {/* Mobile */}
          <MobileCardList className="space-y-2">
            {codes.items.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-gray-900">{c.serialNo}</span>
                  <Badge tone={STATUS_TONE[c.status] ?? "gray"}>{c.status}</Badge>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-gray-500">
                  <span>{TYPE_LABEL[c.type as QrType] ?? c.type}</span>
                  {c.sku && <span>{c.sku}</span>}
                </div>
              </div>
            ))}
          </MobileCardList>

          {/* Desktop */}
          <TableWrapper>
            <Table>
              <THead>
                <TH>Serial No</TH>
                <TH>Type</TH>
                <TH>SKU</TH>
                <TH>Status</TH>
              </THead>
              <tbody>
                {codes.items.map((c) => (
                  <TR key={c.id} interactive>
                    <TD className="font-mono text-xs text-gray-900">{c.serialNo}</TD>
                    <TD className="text-xs text-gray-600">
                      {TYPE_LABEL[c.type as QrType] ?? c.type}
                    </TD>
                    <TD className="text-xs text-gray-500">{c.sku || "—"}</TD>
                    <TD>
                      <Badge tone={STATUS_TONE[c.status] ?? "gray"}>{c.status}</Badge>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

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
