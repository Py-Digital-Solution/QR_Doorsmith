"use client";

import { useActionState, useEffect, useState } from "react";
import { generateBatchAction, type ActionState } from "@/actions/qr";
import { Input, Select } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { PAGE_SIZES } from "@/lib/page-sizes";
import { useSheetLayoutFields } from "@/lib/useSheetLayoutFields";
import { ColumnField } from "./ColumnField";
import { QrSheetPreview } from "./QrSheetPreview";

export type ProductOption = { id: string; sku: string; name: string };

export function GenerateBatchForm({
  products,
  onSuccess,
}: {
  products: ProductOption[];
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    generateBatchAction,
    {},
  );
  // Stored as strings so the fields can be cleared (empty) instead of snapping
  // back to 0. Numeric values are derived below for the totals.
  const [m, setM] = useState("1");
  const [s, setS] = useState("");
  const [p, setP] = useState("");

  const layout = useSheetLayoutFields();

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  const mn = parseInt(m, 10) || 0;
  const sn = parseInt(s, 10) || 0;
  const pn = parseInt(p, 10) || 0;

  // When mn=0: s = total smalls, p = products per small (or total products if s=0 too)
  const totalMasters = mn;
  const totalSmalls = mn > 0 ? mn * sn : sn;
  const totalProducts = mn > 0 ? mn * sn * pn : sn > 0 ? sn * pn : pn;
  const total = totalMasters + totalSmalls + totalProducts;

  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Create an active product first, then come back to generate QR codes.
      </p>
    );
  }

  const numField = (
    label: string,
    name: string,
    value: string,
    set: (v: string) => void,
  ) => (
    <div>
      <Label>{label}</Label>
      <Input
        name={name}
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        placeholder="0"
        onChange={(e) => set(e.target.value.replace(/[^0-9]/g, ""))}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
      <form action={action} className="space-y-4">
        <div>
          <Label>Product</Label>
          <Select name="productId" required defaultValue="">
            <option value="" disabled>Select a product…</option>
            {products.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.sku}  {pr.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {numField("Master boxes", "masterCount", m, setM)}
          {numField(mn > 0 ? "Small / master" : "Total smalls", "smallPerMaster", s, setS)}
          {numField(mn === 0 && sn === 0 ? "Total products" : "Products / small", "productPerSmall", p, setP)}
        </div>

        <div className="rounded-md border border-brand/20 bg-brand-light px-3 py-2 text-sm text-brand-dark">
          Total codes to generate: <span className="font-semibold">{total}</span>
          <span className="text-gray-500">
            {" "}
            ({totalMasters} master + {totalSmalls} small + {totalProducts} product{totalProducts === 1 ? "" : "s"})
          </span>
        </div>

        <details className="rounded-md border border-gray-200 p-3" open>
          <summary className="cursor-pointer text-xs font-medium text-gray-600">
            QR Code sizes (optional)
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Master QR size (mm)</Label>
              <Input
                name="masterQrSize"
                type="number"
                min={10}
                value={layout.masterQrSize}
                onChange={(e) => layout.setMasterQrSize(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <Label>Small QR size (mm)</Label>
              <Input
                name="smallQrSize"
                type="number"
                min={10}
                value={layout.smallQrSize}
                onChange={(e) => layout.setSmallQrSize(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <Label>Product QR size (mm)</Label>
              <Input
                name="productQrSize"
                type="number"
                min={10}
                value={layout.productQrSize}
                onChange={(e) => layout.setProductQrSize(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
          </div>
        </details>

        <details className="rounded-md border border-gray-200 p-3" open>
          <summary className="cursor-pointer text-xs font-medium text-gray-600">
            Print sheet settings (optional)
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <Label>Page size</Label>
              <Select
                name="pageSize"
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

            {/* Independent column counts per type  each sized to the page
                width rather than sharing one column count, so small codes
                don't waste sheet space sized for master boxes. */}
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
        </details>

        {state.error && <Alert variant="error">{state.error}</Alert>}

        <Button type="submit" loading={pending} disabled={total <= 0} fullWidth>
          {pending ? "Generating…" : `Generate ${total} code${total === 1 ? "" : "s"}`}
        </Button>
      </form>

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
