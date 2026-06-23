/**
 * Centralized India Standard Time (IST = UTC+5:30, no DST) helpers.
 *
 * On Vercel/Netlify the Node runtime is UTC, so a bare `new Date().setHours(0,…)`
 * yields a UTC day boundary (00:00 UTC = 5:30 AM IST) and `iso.slice(0, 10)`
 * shows the UTC calendar date. These helpers keep all "today" math and every
 * user-facing timestamp in IST instead. Safe to import from both server and
 * client components (no Node-only APIs).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30
const IST_TZ = "Asia/Kolkata";

/** The UTC instant corresponding to 00:00:00 *today* in IST. */
export function istStartOfToday(): Date {
  const shifted = new Date(Date.now() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

/** The UTC instant `n` days before now (rolling window — timezone-agnostic). */
export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/** "2026-06-24" in IST — replacement for `iso.slice(0, 10)`. */
export function formatISTDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-CA", { timeZone: IST_TZ });
}

/** "2026-06-24 14:30" in IST — replacement for `iso.slice(0, 16).replace("T", " ")`. */
export function formatISTDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  const date = d.toLocaleDateString("en-CA", { timeZone: IST_TZ });
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: IST_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

/** Full localized IST timestamp (e.g. export footers). */
export function formatISTFull(value: string | Date = new Date()): string {
  return new Date(value).toLocaleString("en-IN", { timeZone: IST_TZ });
}
