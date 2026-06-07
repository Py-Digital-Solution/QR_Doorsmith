"use client";

import { useState } from "react";
import { SlideOver } from "./SlideOver";
import { ProductForm } from "./ProductForm";

export function ProductCreatePanel() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
      >
        + Create product
      </button>
      <SlideOver open={open} onClose={() => setOpen(false)} title="Create product">
        <ProductForm onSuccess={() => setOpen(false)} />
      </SlideOver>
    </>
  );
}
