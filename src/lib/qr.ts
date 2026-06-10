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

/** Type-specific serial prefixes: MS-DS (master), SM-DS (small), PD-DS (product). */
export const QR_TYPE_PREFIXES: Record<QrType, string> = {
  master: "MS-DS",
  small: "SM-DS",
  product: "PD-DS",
};

/** Type-prefixed serial, e.g. ("master", 42) → "MS-DS-0000042". */
export function formatSerial(type: QrType, n: number): string {
  return `${QR_TYPE_PREFIXES[type]}-${String(n).padStart(7, "0")}`;
}

/**
 * Infer QrType from a serial/query prefix.
 * "MS" or "MS-DS-..." → "master", "SM" → "small", "PD" → "product".
 */
export function inferTypeFromPrefix(q: string): QrType | undefined {
  const up = q.toUpperCase();
  if (up.startsWith("MS")) return "master";
  if (up.startsWith("SM")) return "small";
  if (up.startsWith("PD")) return "product";
  return undefined;
}

/** Dispatch bill number, e.g. 42 → "DSP-000042". */
export function formatBillNo(n: number): string {
  return `DSP-${String(n).padStart(6, "0")}`;
}
