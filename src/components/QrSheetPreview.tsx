"use client";

import { estimateLayout, type QrCodeType } from "@/lib/qr-layout";
import { PAGE_SIZES, type PageSizeKey } from "@/lib/page-sizes";

const TYPE_LABEL: Record<QrCodeType, { singular: string; plural: string }> = {
  product: { singular: "Product", plural: "Products" },
  small: { singular: "Small box", plural: "Small boxes" },
  master: { singular: "Master box", plural: "Master boxes" },
};

const TYPE_COLOR: Record<QrCodeType, string> = {
  product: "bg-brand/70",
  small: "bg-amber-400/80",
  master: "bg-brand-dark/70",
};

/** Live approximation of the print sheet, in product → small → master order (matches the PDF). */
export function QrSheetPreview({
  pageSizeKey,
  sections,
}: {
  pageSizeKey: PageSizeKey;
  sections: { type: QrCodeType; count: number; qrSizeMm: number; columns: number }[];
}) {
  const { widthMm, heightMm, label } = PAGE_SIZES[pageSizeKey];
  const active = sections.filter((s) => s.count > 0);
  const { pages, sections: laidOut } = estimateLayout(widthMm, heightMm, active);

  // Scale the page outline to a fixed preview width.
  const PREVIEW_W = 220;
  const previewH = (heightMm / widthMm) * PREVIEW_W;
  const MAX_SWATCHES = 12; // cap DOM nodes per section; show a "+N more" note past this

  if (active.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-400">
        Set at least one count to preview the sheet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="mx-auto flex flex-col gap-2 overflow-hidden rounded-md border border-gray-300 bg-white p-2 shadow-sm"
        style={{ width: PREVIEW_W, height: previewH }}
      >
        {laidOut.map((sec) => {
          const shown = Math.min(sec.count, MAX_SWATCHES);
          const extra = sec.count - shown;
          return (
            <div key={sec.type} className="space-y-1">
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${sec.columns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: shown }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-[2px] ${TYPE_COLOR[sec.type]}`}
                  />
                ))}
              </div>
              {extra > 0 && (
                <p className="text-center text-[9px] leading-none text-gray-400">+{extra} more</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1 text-xs text-gray-600">
        {laidOut.map((sec) => (
          <p key={sec.type} className="flex items-center gap-1.5">
            <span className={`inline-block size-2 shrink-0 rounded-[2px] ${TYPE_COLOR[sec.type]}`} />
            {sec.count} {sec.count === 1 ? TYPE_LABEL[sec.type].singular : TYPE_LABEL[sec.type].plural} · {sec.columns} / row · {sec.rows} row{sec.rows === 1 ? "" : "s"}
          </p>
        ))}
        <p className="pt-1 font-medium text-gray-900">
          Est. {pages} sheet{pages === 1 ? "" : "s"} · {label}
        </p>
      </div>
    </div>
  );
}
