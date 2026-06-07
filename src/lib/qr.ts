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

export const SERIAL_PREFIX = "DS";

/** Stable serial format, e.g. 42 → "DS-0000042". */
export function formatSerial(n: number): string {
  return `${SERIAL_PREFIX}-${String(n).padStart(7, "0")}`;
}

/** Dispatch bill number, e.g. 42 → "DSP-000042". */
export function formatBillNo(n: number): string {
  return `DSP-${String(n).padStart(6, "0")}`;
}
