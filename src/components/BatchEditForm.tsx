"use client";

import { useState, useTransition } from "react";
import { updateBatchAction } from "@/actions/qr";
import type { ProductOption } from "./GenerateBatchForm";
import type { BatchDTO } from "@/services/qr";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";
const label = "mb-1 block text-xs font-medium text-gray-600";

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
  const [labelWidthMm, setLabelWidthMm] = useState("");
  const [labelHeightMm, setLabelHeightMm] = useState("");
  const [columns, setColumns] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateBatchAction(batch.id, {
        productId: productId || undefined,
        labelWidthMm: Number(labelWidthMm) || undefined,
        labelHeightMm: Number(labelHeightMm) || undefined,
        columns: Number(columns) || undefined,
      });
      if (res?.error) setError(res.error);
      else onSuccess();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Editing is allowed only while the batch is still in the warehouse (no code
        dispatched or scanned). Changing the product re-links every code in this batch.
      </p>

      <div>
        <label className={label}>Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className={field}
        >
          <option value="">— Keep current —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} · {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={label}>Label W (mm)</label>
          <input
            value={labelWidthMm}
            onChange={(e) => setLabelWidthMm(e.target.value)}
            placeholder="40"
            className={field}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className={label}>Label H (mm)</label>
          <input
            value={labelHeightMm}
            onChange={(e) => setLabelHeightMm(e.target.value)}
            placeholder="40"
            className={field}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className={label}>Columns</label>
          <input
            value={columns}
            onChange={(e) => setColumns(e.target.value)}
            placeholder="4"
            className={field}
            inputMode="numeric"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
