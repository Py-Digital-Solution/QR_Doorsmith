"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { SlideOver } from "./SlideOver";
import { ProductForm } from "./ProductForm";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { deleteProductAction } from "@/actions/products";
import type { ProductDTO } from "@/services/products";

export function ProductActions({ product }: { product: ProductDTO }) {
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteProductAction(product.id);
      if (res?.error) setError(res.error);
      else setConfirm(false);
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

      <SlideOver open={edit} onClose={() => setEdit(false)} title="Edit product">
        <ProductForm product={product} onSuccess={() => setEdit(false)} />
      </SlideOver>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete product"
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
          Delete <span className="font-medium">{product.name}</span> ({product.sku})?
          This cannot be undone.
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
