"use client";

import { useState, useTransition } from "react";
import { updateBatchAction } from "@/actions/qr";
import type { ProductOption } from "./GenerateBatchForm";
import type { BatchDTO } from "@/services/qr";
import { Input, Select } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { PAGE_SIZES, DEFAULT_PAGE_SIZE_KEY } from "@/lib/page-sizes";

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
  const [columns, setColumns] = useState("");
  const [pageSize, setPageSize] = useState(batch.pageSize || DEFAULT_PAGE_SIZE_KEY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateBatchAction(batch.id, {
        productId: productId || undefined,
        columns: Number(columns) || undefined,
        pageSize: pageSize || undefined,
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
        <Select value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
          {Object.entries(PAGE_SIZES).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Columns</Label>
        <Input
          value={columns}
          onChange={(e) => setColumns(e.target.value)}
          placeholder="4"
          inputMode="numeric"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="button" onClick={submit} loading={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
