"use client";

import { useEffect, useRef, useState } from "react";
import { PAGE_SIZES, DEFAULT_PAGE_SIZE_KEY, type PageSizeKey } from "@/lib/page-sizes";
import { recommendColumns } from "@/lib/qr-layout";

export type SheetLayoutInit = {
  pageSize?: string;
  masterQrSize?: number;
  smallQrSize?: number;
  productQrSize?: number;
  masterColumns?: number;
  smallColumns?: number;
  productColumns?: number;
};

/** Shared state for the QR-size + per-type-column fields used by both the
 * generate and edit batch forms, so column recommendations, the "touched"
 * override behaviour, and the live preview stay consistent between them. */
export function useSheetLayoutFields(init?: SheetLayoutInit) {
  const [pageSize, setPageSize] = useState<PageSizeKey>(
    (init?.pageSize as PageSizeKey) || DEFAULT_PAGE_SIZE_KEY,
  );
  const [masterQrSize, setMasterQrSize] = useState(String(init?.masterQrSize ?? 25));
  const [smallQrSize, setSmallQrSize] = useState(String(init?.smallQrSize ?? 15));
  const [productQrSize, setProductQrSize] = useState(String(init?.productQrSize ?? 10));

  const pageWidthMm = PAGE_SIZES[pageSize].widthMm;
  const recMaster = recommendColumns(pageWidthMm, Number(masterQrSize) || 25);
  const recSmall = recommendColumns(pageWidthMm, Number(smallQrSize) || 15);
  const recProduct = recommendColumns(pageWidthMm, Number(productQrSize) || 10);

  const [masterColumns, setMasterColumns] = useState(String(init?.masterColumns ?? recMaster));
  const [smallColumns, setSmallColumns] = useState(String(init?.smallColumns ?? recSmall));
  const [productColumns, setProductColumns] = useState(String(init?.productColumns ?? recProduct));
  // Pre-filled values count as an explicit choice, not "auto" — only override
  // on page-size/QR-size changes once the user (or an unset default) hasn't pinned it.
  const masterTouched = useRef(init?.masterColumns != null);
  const smallTouched = useRef(init?.smallColumns != null);
  const productTouched = useRef(init?.productColumns != null);

  useEffect(() => {
    if (!masterTouched.current) setMasterColumns(String(recMaster));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recMaster]);
  useEffect(() => {
    if (!smallTouched.current) setSmallColumns(String(recSmall));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recSmall]);
  useEffect(() => {
    if (!productTouched.current) setProductColumns(String(recProduct));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recProduct]);

  return {
    pageSize,
    setPageSize,
    masterQrSize,
    setMasterQrSize,
    smallQrSize,
    setSmallQrSize,
    productQrSize,
    setProductQrSize,
    masterColumns,
    setMasterColumns: (v: string) => { masterTouched.current = true; setMasterColumns(v); },
    smallColumns,
    setSmallColumns: (v: string) => { smallTouched.current = true; setSmallColumns(v); },
    productColumns,
    setProductColumns: (v: string) => { productTouched.current = true; setProductColumns(v); },
    resetMasterColumns: () => { masterTouched.current = false; setMasterColumns(String(recMaster)); },
    resetSmallColumns: () => { smallTouched.current = false; setSmallColumns(String(recSmall)); },
    resetProductColumns: () => { productTouched.current = false; setProductColumns(String(recProduct)); },
    masterTouched: masterTouched.current,
    smallTouched: smallTouched.current,
    productTouched: productTouched.current,
    recMaster,
    recSmall,
    recProduct,
  };
}
