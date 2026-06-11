"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SlideOver } from "./SlideOver";
import { ProductForm } from "./ProductForm";
import { Button } from "./ui/Button";

export function ProductCreatePanel() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Create product
      </Button>
      <SlideOver open={open} onClose={() => setOpen(false)} title="Create product">
        <ProductForm onSuccess={() => setOpen(false)} />
      </SlideOver>
    </>
  );
}
