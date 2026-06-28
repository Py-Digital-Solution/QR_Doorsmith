"use client";

import { useState } from "react";
import {
  PAGE_SIZES,
  DEFAULT_PAGE_SIZE_KEY,
  type PageSizeKey,
} from "@/lib/page-sizes";

const actionLink =
  "focus-ring inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-brand-dark transition-colors hover:bg-brand-light";

/** "PDF" export with a page-size picker (12×18 default, plus A4/A3/A2). */
export function PdfDownload({ id }: { id: string }) {
  const [size, setSize] = useState<PageSizeKey>(DEFAULT_PAGE_SIZE_KEY);
  return (
    <span className="inline-flex items-center gap-1">
      <select
        value={size}
        onChange={(e) => setSize(e.target.value as PageSizeKey)}
        aria-label="Page size"
        className="focus-ring rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700"
      >
        {Object.entries(PAGE_SIZES).map(([key, { label }]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <a
        href={`/admin/qr/${id}/pdf?size=${size}`}
        target="_blank"
        rel="noopener noreferrer"
        className={actionLink}
      >
        PDF
      </a>
    </span>
  );
}
