"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "./SlideOver";
import { BatchEditForm } from "./BatchEditForm";
import { deleteBatchAction } from "@/actions/qr";
import type { ProductOption } from "./GenerateBatchForm";
import type { BatchDTO } from "@/services/qr";

export function BatchActions({
  batch,
  products,
  redirectOnDelete,
}: {
  batch: BatchDTO;
  products: ProductOption[];
  /** When deleting from the detail page, send the user back to the list. */
  redirectOnDelete?: boolean;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = products.find((p) => p.sku === batch.productSku);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteBatchAction(batch.id);
      if (res?.error) setError(res.error);
      else {
        setConfirm(false);
        if (redirectOnDelete) router.push("/admin/qr");
        else router.refresh();
      }
    });
  }

  const btn = "rounded px-2 py-1 text-xs font-medium transition-colors";

  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => setEdit(true)}
        className={`${btn} text-brand-dark hover:bg-brand-light`}
      >
        Edit
      </button>
      <button
        onClick={() => {
          setError(null);
          setConfirm(true);
        }}
        className={`${btn} text-red-600 hover:bg-red-50`}
      >
        Delete
      </button>

      <SlideOver open={edit} onClose={() => setEdit(false)} title="Edit batch">
        <BatchEditForm
          batch={batch}
          products={products}
          currentProductId={current?.id}
          onSuccess={() => {
            setEdit(false);
            router.refresh();
          }}
        />
      </SlideOver>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold">Delete batch</h3>
            <p className="mt-2 text-sm text-gray-600">
              Delete this batch and all{" "}
              <span className="font-medium">{batch.total}</span> codes
              ({batch.productSku})? This cannot be undone, and is blocked if any code
              has been dispatched or scanned.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirm(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={pending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
