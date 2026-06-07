"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createProductAction,
  updateProductAction,
  type ActionState,
} from "@/actions/products";
import { PRODUCT_STATUSES } from "@/lib/product";
import type { ProductDTO } from "@/services/products";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";
const labelCls = "mb-1 block text-xs font-medium text-gray-600";

export function ProductForm({
  product,
  onSuccess,
}: {
  product?: ProductDTO;
  onSuccess?: () => void;
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  const [videoLinks, setVideoLinks] = useState<string[]>(
    product?.videoLinks?.length ? product.videoLinks : [""],
  );

  const updateLink = (i: number, val: string) =>
    setVideoLinks((prev) => prev.map((l, idx) => (idx === i ? val : l)));
  const addLink = () => setVideoLinks((prev) => [...prev, ""]);
  const removeLink = (i: number) =>
    setVideoLinks((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i),
    );

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div>
        <label className={labelCls}>SKU</label>
        <input name="sku" defaultValue={product?.sku} required className={field} />
      </div>
      <div>
        <label className={labelCls}>Name</label>
        <input name="name" defaultValue={product?.name} required className={field} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>MRP (₹)</label>
          <input
            name="mrp"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.mrp}
            required
            className={field}
          />
        </div>
        <div>
          <label className={labelCls}>Sales price (₹)</label>
          <input
            name="salesPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.salesPrice}
            required
            className={field}
          />
        </div>
        <div>
          <label className={labelCls}>Reward points</label>
          <input
            name="rewardPoints"
            type="number"
            min={0}
            step="1"
            defaultValue={product?.rewardPoints}
            required
            className={field}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea name="description" defaultValue={product?.description} rows={2} className={field} />
      </div>

      <div>
        <label className={labelCls}>
          Video links{" "}
          <span className="font-normal text-gray-400">
            (YouTube / Instagram / Facebook — optional)
          </span>
        </label>
        <div className="space-y-2">
          {videoLinks.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="videoLinks"
                type="url"
                placeholder="https://youtube.com/…"
                value={link}
                onChange={(e) => updateLink(i, e.target.value)}
                className={field}
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                aria-label="Remove link"
                className="rounded-md border border-gray-300 px-3 text-gray-500 hover:bg-gray-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLink}
          className="mt-2 text-xs font-medium text-brand-dark hover:underline"
        >
          + Add another video link
        </button>
      </div>

      <div>
        <label className={labelCls}>Status</label>
        <select name="status" defaultValue={product?.status ?? "active"} className={field}>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
