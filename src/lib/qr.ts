/** Pure QR constants/helpers — safe for client + server (no DB imports). */

export const QR_TYPES = ["master", "small", "product"] as const;
export type QrType = (typeof QR_TYPES)[number];

// Lifecycle (SOW 1.8 / 1.4 / 1.7).
export const QR_STATUSES = [
  "inactive", // generated, "In Warehouse - Inactive"
  "active", // dispatched / scannable
  "scanned", // points credited to a khati
  "disabled", // e.g. inner product QR disabled because its small-box was scanned
  "returned", // product returned, points reversed
  "reactivated", // reactivated for resale after a return
] as const;
export type QrStatus = (typeof QR_STATUSES)[number];

export const QR_BATCH_STATUSES = ["in_warehouse", "active", "archived"] as const;
export type QrBatchStatus = (typeof QR_BATCH_STATUSES)[number];

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

/** DS-MS-{SKU}-{N}  e.g. DS-MS-LR001-0001 */
export function formatMasterSerial(sku: string, n: number): string {
  return `DS-MS-${sku}-${pad(n)}`;
}

/** DS-SM-{SKU}-{N}  e.g. DS-SM-LR001-0001 */
export function formatSmallSerial(sku: string, n: number): string {
  return `DS-SM-${sku}-${pad(n)}`;
}

/** DS-PD-{SKU}-{N}  e.g. DS-PD-LR001-0001 */
export function formatProductSerial(sku: string, n: number): string {
  return `DS-PD-${sku}-${pad(n)}`;
}

/**
 * Infer QrType from a serial prefix.
 * "DS-MS..." → "master", "DS-SM..." → "small", "DS-PD..." → "product".
 */
export function inferTypeFromPrefix(q: string): QrType | undefined {
  const up = q.toUpperCase();
  if (up.startsWith("DS-MS")) return "master";
  if (up.startsWith("DS-SM")) return "small";
  if (up.startsWith("DS-PD")) return "product";
  return undefined;
}

/** Dispatch bill number, e.g. 42 → "DSP-000042". */
export function formatBillNo(n: number): string {
  return `DSP-${String(n).padStart(6, "0")}`;
}
