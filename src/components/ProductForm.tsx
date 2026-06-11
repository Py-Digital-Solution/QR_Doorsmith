"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  createProductAction,
  updateProductAction,
  type ActionState,
} from "@/actions/products";
import { PRODUCT_STATUSES } from "@/lib/product";
import type { ProductDTO } from "@/services/products";
import { Input, Select, Textarea } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";

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
        <Label>SKU</Label>
        <Input name="sku" defaultValue={product?.sku} required />
      </div>
      <div>
        <Label>Name</Label>
        <Input name="name" defaultValue={product?.name} required />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label>MRP (₹)</Label>
          <Input
            name="mrp"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.mrp}
            required
          />
        </div>
        <div>
          <Label>Sales price (₹)</Label>
          <Input
            name="salesPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.salesPrice}
            required
          />
        </div>
        <div>
          <Label>Reward points</Label>
          <Input
            name="rewardPoints"
            type="number"
            min={0}
            step="1"
            defaultValue={product?.rewardPoints}
            required
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea name="description" defaultValue={product?.description} rows={2} />
      </div>

      <div>
        <Label>
          Video links{" "}
          <span className="font-normal text-gray-400">
            (YouTube / Instagram / Facebook — optional)
          </span>
        </Label>
        <div className="space-y-2">
          {videoLinks.map((link, i) => (
            <div key={i} className="flex gap-2">
              <Input
                name="videoLinks"
                type="url"
                placeholder="https://youtube.com/…"
                value={link}
                onChange={(e) => updateLink(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                aria-label="Remove link"
                className="focus-ring rounded-md border border-gray-300 px-3 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <X className="size-4" aria-hidden />
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
        <Label>Status</Label>
        <Select name="status" defaultValue={product?.status ?? "active"}>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" loading={pending} fullWidth>
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </Button>
    </form>
  );
}
