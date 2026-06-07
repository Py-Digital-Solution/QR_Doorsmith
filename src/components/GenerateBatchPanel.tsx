"use client";

import { useState } from "react";
import { SlideOver } from "./SlideOver";
import { GenerateBatchForm, type ProductOption } from "./GenerateBatchForm";

export function GenerateBatchPanel({ products }: { products: ProductOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
      >
        + Generate batch
      </button>
      <SlideOver open={open} onClose={() => setOpen(false)} title="Generate QR batch">
        <GenerateBatchForm products={products} onSuccess={() => setOpen(false)} />
      </SlideOver>
    </>
  );
}
