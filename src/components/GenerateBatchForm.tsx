"use client";

import { useActionState, useEffect, useState } from "react";
import { generateBatchAction, type ActionState } from "@/actions/qr";
import { Input, Select } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";

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
  const [m, setM] = useState(1);
  const [s, setS] = useState(0);
  const [p, setP] = useState(0);

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  // When m=0: s = total smalls, p = products per small (or total products if s=0 too)
  const totalMasters = m;
  const totalSmalls = m > 0 ? m * s : s;
  const totalProducts = m > 0 ? m * s * p : s > 0 ? s * p : p;
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
    value: number,
    set: (n: number) => void,
  ) => (
    <div>
      <Label>{label}</Label>
      <Input
        name={name}
        type="number"
        min={0}
        value={value}
        onChange={(e) => set(Math.max(0, parseInt(e.target.value, 10) || 0))}
      />
    </div>
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Product</Label>
        <Select name="productId" required defaultValue="">
          <option value="" disabled>Select a product…</option>
          {products.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.sku} — {pr.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {numField("Master boxes", "masterCount", m, setM)}
        {numField(m > 0 ? "Small / master" : "Total smalls", "smallPerMaster", s, setS)}
        {numField(m === 0 && s === 0 ? "Total products" : "Products / small", "productPerSmall", p, setP)}
      </div>

      <div className="rounded-md border border-brand/20 bg-brand-light px-3 py-2 text-sm text-brand-dark">
        Total codes to generate: <span className="font-semibold">{total}</span>
        <span className="text-gray-500">
          {" "}
          ({totalMasters} master + {totalSmalls} small + {totalProducts} product)
        </span>
      </div>

      <details className="rounded-md border border-gray-200 p-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-600">
          Print sheet settings (optional)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label>Label W (mm)</Label>
            <Input name="labelWidthMm" type="number" min={0} defaultValue={40} />
          </div>
          <div>
            <Label>Label H (mm)</Label>
            <Input name="labelHeightMm" type="number" min={0} defaultValue={40} />
          </div>
          <div>
            <Label>Columns</Label>
            <Input name="columns" type="number" min={1} defaultValue={4} />
          </div>
        </div>
      </details>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" loading={pending} disabled={total <= 0} fullWidth>
        {pending ? "Generating…" : `Generate ${total} codes`}
      </Button>
    </form>
  );
}
