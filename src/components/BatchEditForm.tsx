"use client";

import { useState, useTransition } from "react";
import { updateBatchAction } from "@/actions/qr";
import type { ProductOption } from "./GenerateBatchForm";
import type { BatchDTO } from "@/services/qr";
import { Input, Select } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { PAGE_SIZES } from "@/lib/page-sizes";
import { useSheetLayoutFields } from "@/lib/useSheetLayoutFields";
import { ColumnField } from "./ColumnField";
import { QrSheetPreview } from "./QrSheetPreview";

export function BatchEditForm({
  batch,
  products,
  currentProductId,
  onSuccess,
}: {
  batch: BatchDTO;
  products: ProductOption[];
  currentProductId?: string;
  onSuccess: () => void;
}) {
  const [productId, setProductId] = useState(currentProductId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const layout = useSheetLayoutFields({
    pageSize: batch.pageSize,
    masterQrSize: batch.qrSizes.master,
    smallQrSize: batch.qrSizes.small,
    productQrSize: batch.qrSizes.product,
    masterColumns: batch.columns.master,
    smallColumns: batch.columns.small,
    productColumns: batch.columns.product,
  });

  // Counts are fixed once codes are generated  only sizing/layout is editable here.
  const totalMasters = batch.masterCount;
  const totalSmalls = batch.masterCount > 0 ? batch.masterCount * batch.smallPerMaster : batch.smallPerMaster;
  const totalProducts =
    batch.masterCount > 0
      ? batch.masterCount * batch.smallPerMaster * batch.productPerSmall
      : batch.smallPerMaster > 0
        ? batch.smallPerMaster * batch.productPerSmall
        : batch.productPerSmall;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateBatchAction(batch.id, {
        productId: productId || undefined,
        pageSize: layout.pageSize,
        masterQrSize: Number(layout.masterQrSize) || undefined,
        smallQrSize: Number(layout.smallQrSize) || undefined,
        productQrSize: Number(layout.productQrSize) || undefined,
        masterColumns: Number(layout.masterColumns) || undefined,
        smallColumns: Number(layout.smallColumns) || undefined,
        productColumns: Number(layout.productColumns) || undefined,
      });
      if (res?.error) setError(res.error);
      else onSuccess();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Editing is allowed only while the batch is still in the warehouse (no code
          dispatched or scanned). Changing the product re-links every code in this batch.
        </p>

        <div>
          <Label>Product</Label>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value=""> Keep current </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Page size</Label>
          <Select
            value={layout.pageSize}
            onChange={(e) => layout.setPageSize(e.target.value as keyof typeof PAGE_SIZES)}
          >
            {Object.entries(PAGE_SIZES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">QR Code sizes</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Master QR size (mm)</Label>
              <Input
                type="number"
                min={10}
                value={layout.masterQrSize}
                onChange={(e) => layout.setMasterQrSize(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <Label>Small QR size (mm)</Label>
              <Input
                type="number"
                min={10}
                value={layout.smallQrSize}
                onChange={(e) => layout.setSmallQrSize(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <Label>Product QR size (mm)</Label>
              <Input
                type="number"
                min={10}
                value={layout.productQrSize}
                onChange={(e) => layout.setProductQrSize(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">Columns per sheet</p>
          {/* Independent per type, same as batch generation  keeps small
              codes from wasting sheet space sized for master boxes. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ColumnField
              label="Master columns"
              name="masterColumns"
              value={layout.masterColumns}
              onChange={layout.setMasterColumns}
              recommended={layout.recMaster}
              touched={layout.masterTouched}
              onReset={layout.resetMasterColumns}
            />
            <ColumnField
              label="Small columns"
              name="smallColumns"
              value={layout.smallColumns}
              onChange={layout.setSmallColumns}
              recommended={layout.recSmall}
              touched={layout.smallTouched}
              onReset={layout.resetSmallColumns}
            />
            <ColumnField
              label="Product columns"
              name="productColumns"
              value={layout.productColumns}
              onChange={layout.setProductColumns}
              recommended={layout.recProduct}
              touched={layout.productTouched}
              onReset={layout.resetProductColumns}
            />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="button" onClick={submit} loading={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="lg:sticky lg:top-0 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          Sheet preview
        </p>
        <QrSheetPreview
          pageSizeKey={layout.pageSize}
          sections={[
            { type: "product", count: totalProducts, qrSizeMm: Number(layout.productQrSize) || 10, columns: Number(layout.productColumns) || layout.recProduct },
            { type: "small", count: totalSmalls, qrSizeMm: Number(layout.smallQrSize) || 15, columns: Number(layout.smallColumns) || layout.recSmall },
            { type: "master", count: totalMasters, qrSizeMm: Number(layout.masterQrSize) || 25, columns: Number(layout.masterColumns) || layout.recMaster },
          ]}
        />
      </div>
    </div>
  );
}
