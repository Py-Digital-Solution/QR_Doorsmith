"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SlideOver } from "./SlideOver";
import { Button } from "./ui/Button";
import { GenerateBatchForm, type ProductOption } from "./GenerateBatchForm";

export function GenerateBatchPanel({ products }: { products: ProductOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Generate batch
      </Button>
      <SlideOver open={open} onClose={() => setOpen(false)} title="Generate QR batch" wide>
        <GenerateBatchForm products={products} onSuccess={() => setOpen(false)} />
      </SlideOver>
    </>
  );
}
