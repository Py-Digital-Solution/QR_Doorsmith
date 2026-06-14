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

/** "Door Knob" → "DK", "Main Door Lock" → "MDL" (max 4 letters). */
export function productInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .join("");
  return letters.slice(0, 4) || "XX";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "MS-DK-02" */
export function formatMasterSerial(initials: string, n: number): string {
  return `MS-${initials}-${pad(n)}`;
}

/** With master parent: "SM-MS02-DK-01". Standalone: "SM-DK-01". */
export function formatSmallSerial(initials: string, n: number, masterN?: number): string {
  return masterN != null
    ? `SM-MS${pad(masterN)}-${initials}-${pad(n)}`
    : `SM-${initials}-${pad(n)}`;
}

/** Full: "PD-SM01-MS02-DK-01". Partial parents are dropped. */
export function formatProductSerial(
  initials: string,
  n: number,
  smallN?: number,
  masterN?: number,
): string {
  const parts: string[] = ["PD"];
  if (smallN != null) parts.push(`SM${pad(smallN)}`);
  if (masterN != null) parts.push(`MS${pad(masterN)}`);
  parts.push(initials, pad(n));
  return parts.join("-");
}

/**
 * Infer QrType from a serial/query prefix.
 * "MS..." → "master", "SM..." → "small", "PD..." → "product".
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
