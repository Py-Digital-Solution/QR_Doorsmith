/**
 * Normalize an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts: 10-digit, 91XXXXXXXXXX (12-digit), +91XXXXXXXXXX, or with spaces/dashes.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("091")) return `+${digits.slice(1)}`;
  // already has + prefix — return as-is
  if (trimmed.startsWith("+")) return trimmed;
  return trimmed;
}

/** Strip the +91 prefix for display in input fields (shows 10-digit number). */
export function displayPhone(stored: string): string {
  return stored.replace(/^\+91/, "").replace(/\D/g, "");
}
