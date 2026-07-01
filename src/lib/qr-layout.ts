/**
 * Shared print-sheet layout math for the QR batch PDF. Used by the client-side
 * live preview (GenerateBatchForm) and mirrors the row-flow logic the server
 * PDF route (`/admin/qr/[id]/pdf`) uses, so the preview matches the real output.
 */

export const PRINT_MARGIN_MM = 10;
export const CAPTION_GAP_MM = 4;
export const ROW_GAP_MM = 3.5;
export const SECTION_GAP_MM = 6;

/** Suggest a column count that fills the page width for a given QR size. */
export function recommendColumns(pageWidthMm: number, qrSizeMm: number): number {
  const printable = pageWidthMm - 2 * PRINT_MARGIN_MM;
  const cell = qrSizeMm + 6; // breathing room for the serial caption + gutter
  return Math.max(1, Math.min(12, Math.floor(printable / cell)));
}

export type QrCodeType = "product" | "small" | "master";

export type LayoutSection = {
  type: QrCodeType;
  count: number;
  qrSizeMm: number;
  columns: number;
};

export type LayoutSectionResult = LayoutSection & { rows: number };

export type LayoutEstimate = {
  pages: number;
  sections: LayoutSectionResult[];
};

/** Approximate how many sheets a batch will need, section by section (product → small → master), each with its own column count. */
export function estimateLayout(
  pageWidthMm: number,
  pageHeightMm: number,
  sections: LayoutSection[],
): LayoutEstimate {
  const printableH = pageHeightMm - 2 * PRINT_MARGIN_MM;
  let pages = 1;
  let used = 0; // height consumed on the current page
  const results: LayoutSectionResult[] = [];

  for (const sec of sections) {
    if (sec.count <= 0) continue;
    const cols = Math.max(1, sec.columns);
    const rows = Math.ceil(sec.count / cols);
    results.push({ ...sec, columns: cols, rows });

    const rowH = sec.qrSizeMm + CAPTION_GAP_MM + ROW_GAP_MM;
    for (let r = 0; r < rows; r++) {
      if (used + rowH > printableH) {
        pages += 1;
        used = 0;
      }
      used += rowH;
    }
    used += SECTION_GAP_MM;
  }

  return { pages, sections: results };
}
