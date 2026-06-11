"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { SlideOver } from "./SlideOver";
import { BatchEditForm } from "./BatchEditForm";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
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

  const btn =
    "focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors";

  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => setEdit(true)}
        className={`${btn} text-brand-dark hover:bg-brand-light`}
      >
        <Pencil className="size-3.5" aria-hidden />
        Edit
      </button>
      <button
        onClick={() => {
          setError(null);
          setConfirm(true);
        }}
        className={`${btn} text-red-600 hover:bg-red-50`}
      >
        <Trash2 className="size-3.5" aria-hidden />
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

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete batch"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete} loading={pending}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete this batch and all{" "}
          <span className="font-medium">{batch.total}</span> codes
          ({batch.productSku})? This cannot be undone, and is blocked if any code
          has been dispatched or scanned.
        </p>
        {error && (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        )}
      </Modal>
    </div>
  );
}
