"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  createProductAction,
  updateProductAction,
  type ActionState,
} from "@/actions/products";
import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/product";
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

  // Controlled fields so form data survives server action submissions
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [mrp, setMrp] = useState(product?.mrp?.toString() ?? "");
  const [salesPrice, setSalesPrice] = useState(
    product?.salesPrice?.toString() ?? "",
  );
  const [rewardPoints, setRewardPoints] = useState(
    product?.rewardPoints?.toString() ?? "",
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "active");
  const [videoLinks, setVideoLinks] = useState<string[]>(
    product?.videoLinks?.length ? product.videoLinks : [""],
  );

  const skuRef = useRef<HTMLInputElement>(null);

  const isSkuError = !!(
    state.error &&
    (state.error.toLowerCase().includes("sku") ||
      state.error.toLowerCase().includes("already exist"))
  );

  // Focus + select SKU field when a SKU duplicate error appears
  useEffect(() => {
    if (isSkuError) {
      skuRef.current?.focus();
      skuRef.current?.select();
    }
  }, [isSkuError, state]);

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  const updateLink = (i: number, val: string) =>
    setVideoLinks((prev) => prev.map((l, idx) => (idx === i ? val : l)));
  const addLink = () => setVideoLinks((prev) => [...prev, ""]);
  const removeLink = (i: number) =>
    setVideoLinks((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i),
    );

  return (
    <form action={formAction} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div>
        <Label>
          SKU{" "}
          {!product && (
            <span className="font-normal text-gray-400">
              (leave blank to auto-generate)
            </span>
          )}
        </Label>
        {product ? (
          <>
            <input type="hidden" name="sku" value={product.sku} />
            <Input
              value={product.sku}
              readOnly
              className="cursor-default bg-gray-50 text-gray-500"
            />
          </>
        ) : (
          <Input
            ref={skuRef}
            name="sku"
            placeholder="e.g. SKU-20260001 — leave blank to auto-generate"
            autoComplete="off"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            invalid={isSkuError}
          />
        )}
        {isSkuError && (
          <p className="mt-1 text-xs text-red-600">{state.error}</p>
        )}
      </div>

      <div>
        <Label>Name</Label>
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label>MRP (₹)</Label>
          <Input
            name="mrp"
            type="number"
            min={0}
            step="0.01"
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
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
            value={salesPrice}
            onChange={(e) => setSalesPrice(e.target.value)}
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
            value={rewardPoints}
            onChange={(e) => setRewardPoints(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
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
        <Select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductStatus)}
        >
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {state.error && !isSkuError && (
        <Alert variant="error">{state.error}</Alert>
      )}

      <Button type="submit" loading={pending} fullWidth>
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </Button>
    </form>
  );
}
