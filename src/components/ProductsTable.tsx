import type { ProductDTO } from "@/services/products";
import { ProductActions } from "./ProductActions";
import { Badge, statusTone } from "./ui/Badge";
import {
  TableWrapper,
  Table,
  THead,
  TH,
  TR,
  TD,
  MobileCardList,
  MobileCard,
} from "./ui/Table";
import { EmptyState } from "./ui/EmptyState";

export function ProductsTable({ products }: { products: ProductDTO[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-card">
        <EmptyState
          icon="package"
          title="No products yet"
          description="Create a product to start generating QR codes."
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <MobileCardList>
        {products.map((p) => (
          <MobileCard
            key={p.id}
            title={p.name}
            badge={<Badge tone={statusTone(p.status)}>{p.status}</Badge>}
            actions={<ProductActions product={p} />}
          >
            <p className="font-mono">{p.sku}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
              <span>MRP ₹{p.mrp}</span>
              <span>Sales ₹{p.salesPrice}</span>
              <span className="font-medium text-brand-dark">{p.rewardPoints} pts</span>
            </div>
          </MobileCard>
        ))}
      </MobileCardList>

      {/* Desktop: table */}
      <TableWrapper>
        <Table>
          <THead>
            <TH>SKU</TH>
            <TH>Name</TH>
            <TH align="right">MRP</TH>
            <TH align="right">Sales</TH>
            <TH align="right">Points</TH>
            <TH>Status</TH>
            <TH align="right">Actions</TH>
          </THead>
          <tbody>
            {products.map((p) => (
              <TR key={p.id} interactive>
                <TD className="font-mono text-xs text-gray-600">{p.sku}</TD>
                <TD className="font-medium text-gray-900">{p.name}</TD>
                <TD align="right" className="text-gray-600">₹{p.mrp}</TD>
                <TD align="right" className="text-gray-600">₹{p.salesPrice}</TD>
                <TD align="right" className="font-medium text-brand-dark">
                  {p.rewardPoints}
                </TD>
                <TD>
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </TD>
                <TD>
                  <ProductActions product={p} />
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
    </>
  );
}
