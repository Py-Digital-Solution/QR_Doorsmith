import Link from "next/link";
import type { BatchDTO } from "@/services/qr";
import { formatSerial } from "@/lib/qr";
import { BatchActions } from "./BatchActions";
import type { ProductOption } from "./GenerateBatchForm";
import { Badge, statusTone } from "./ui/Badge";
import {
  TableWrapper,
  Table,
  THead,
  TH,
  TR,
  TD,
  MobileCardList,
} from "./ui/Table";
import { EmptyState } from "./ui/EmptyState";

const actionLink =
  "focus-ring inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-light";

function PdfLink({ id }: { id: string }) {
  return (
    <a
      href={`/admin/qr/${id}/pdf`}
      target="_blank"
      rel="noopener noreferrer"
      className={actionLink}
    >
      PDF
    </a>
  );
}

function ManageLink({ id }: { id: string }) {
  return (
    <Link href={`/admin/qr/${id}`} className={actionLink}>
      Manage
    </Link>
  );
}

export function BatchesTable({
  batches,
  products,
}: {
  batches: BatchDTO[];
  products: ProductOption[];
}) {
  if (batches.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-card">
        <EmptyState
          icon="qr-code"
          title="No batches yet"
          description="Generate a QR batch to get started."
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <MobileCardList>
        {batches.map((b) => (
          <div
            key={b.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-gray-600">{b.productSku}</span>
              <Badge tone={statusTone(b.status)}>{b.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-900">
              {b.masterCount}×{b.smallPerMaster}×{b.productPerSmall} ·{" "}
              <span className="font-medium">{b.total} codes</span>
            </p>
            <p className="mt-0.5 text-xs">
              <span className="text-amber-700">{b.warehouseCount} in warehouse</span>
              {" · "}
              <span className="text-green-700">{b.dispatchedCount} dispatched</span>
            </p>
            <p className="font-mono text-xs text-gray-500">
              {formatSerial("master", b.serialStart)} – {formatSerial("master", b.serialEnd)}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">{b.createdAt.slice(0, 10)}</span>
              <div className="flex items-center gap-1">
                <ManageLink id={b.id} />
                <PdfLink id={b.id} />
              </div>
            </div>
            <div className="mt-2 border-t border-gray-100 pt-2">
              <BatchActions batch={b} products={products} />
            </div>
          </div>
        ))}
      </MobileCardList>

      {/* Desktop: table */}
      <TableWrapper>
        <Table>
          <THead>
            <TH>Date</TH>
            <TH>Product</TH>
            <TH>Structure (M×S×P)</TH>
            <TH align="right">Total</TH>
            <TH align="right">Warehouse / Sent</TH>
            <TH>Serial range</TH>
            <TH>Status</TH>
            <TH align="right">Actions</TH>
          </THead>
          <tbody>
            {batches.map((b) => (
              <TR key={b.id} interactive>
                <TD className="text-gray-600">{b.createdAt.slice(0, 10)}</TD>
                <TD className="font-mono text-xs text-gray-600">{b.productSku}</TD>
                <TD className="text-gray-600">
                  {b.masterCount}×{b.smallPerMaster}×{b.productPerSmall}
                </TD>
                <TD align="right" className="font-medium text-gray-900">
                  {b.total}
                </TD>
                <TD align="right" className="text-xs">
                  <span className="text-amber-700">{b.warehouseCount}</span>
                  {" / "}
                  <span className="text-green-700">{b.dispatchedCount}</span>
                </TD>
                <TD className="font-mono text-xs text-gray-600">
                  {formatSerial("master", b.serialStart)} – {formatSerial("master", b.serialEnd)}
                </TD>
                <TD>
                  <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <ManageLink id={b.id} />
                    <PdfLink id={b.id} />
                    <BatchActions batch={b} products={products} />
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
    </>
  );
}
