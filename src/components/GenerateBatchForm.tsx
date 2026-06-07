"use client";

import { useActionState, useEffect, useState } from "react";
import { generateBatchAction, type ActionState } from "@/actions/qr";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";
const labelCls = "mb-1 block text-xs font-medium text-gray-600";

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

  const total = m + m * s + m * s * p;

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
      <label className={labelCls}>{label}</label>
      <input
        name={name}
        type="number"
        min={0}
        value={value}
        onChange={(e) => set(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className={field}
      />
    </div>
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelCls}>Product</label>
        <select name="productId" required className={field}>
          {products.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.sku} — {pr.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {numField("Master boxes", "masterCount", m, setM)}
        {numField("Small / master", "smallPerMaster", s, setS)}
        {numField("Products / small", "productPerSmall", p, setP)}
      </div>

      <div className="rounded-md bg-brand-light px-3 py-2 text-sm text-brand-dark">
        Total codes to generate: <span className="font-semibold">{total}</span>
        <span className="text-gray-500">
          {" "}
          ({m} master + {m * s} small + {m * s * p} product)
        </span>
      </div>

      <details className="rounded-md border border-gray-200 p-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-600">
          Print sheet settings (optional)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Label W (mm)</label>
            <input name="labelWidthMm" type="number" min={0} defaultValue={40} className={field} />
          </div>
          <div>
            <label className={labelCls}>Label H (mm)</label>
            <input name="labelHeightMm" type="number" min={0} defaultValue={40} className={field} />
          </div>
          <div>
            <label className={labelCls}>Columns</label>
            <input name="columns" type="number" min={1} defaultValue={4} className={field} />
          </div>
        </div>
      </details>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || total <= 0}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Generating…" : `Generate ${total} codes`}
      </button>
    </form>
  );
}
