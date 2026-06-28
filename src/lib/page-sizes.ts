/**
 * Print page sizes offered when exporting a QR batch to PDF.
 * Dimensions are in millimetres (portrait). 12×18 inches is the default print
 * sheet; A-series are the common office sizes.
 */
export const PAGE_SIZES = {
  "12x18": { label: '12" × 18"', widthMm: 304.8, heightMm: 457.2 },
  A4: { label: "A4", widthMm: 210, heightMm: 297 },
  A3: { label: "A3", widthMm: 297, heightMm: 420 },
  A2: { label: "A2", widthMm: 420, heightMm: 594 },
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZES;

export const DEFAULT_PAGE_SIZE_KEY: PageSizeKey = "12x18";

/** Resolve a query-string size to its dimensions, falling back to the default. */
export function resolvePageSize(key?: string | null) {
  const k = (key && key in PAGE_SIZES ? key : DEFAULT_PAGE_SIZE_KEY) as PageSizeKey;
  return PAGE_SIZES[k];
}
