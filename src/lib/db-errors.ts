/** True for a MongoDB duplicate-key error (unique index violation). */
export function isDuplicateKeyError(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    (e as { code?: number }).code === 11000
  );
}

/**
 * For a MongoDB duplicate-key error, the name of the field that collided
 * (e.g. "phone", "email", "sku"). Returns null if it can't be determined or the
 * error isn't a duplicate-key error. Mongo puts the offending field in
 * `keyPattern`/`keyValue`; we fall back to parsing the index name if needed.
 */
export function duplicateKeyField(e: unknown): string | null {
  if (!isDuplicateKeyError(e)) return null;
  const err = e as { keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown>; message?: string };
  const fromPattern = err.keyPattern && Object.keys(err.keyPattern)[0];
  if (fromPattern) return fromPattern;
  const fromValue = err.keyValue && Object.keys(err.keyValue)[0];
  if (fromValue) return fromValue;
  // Fallback: parse "index: email_1 dup key" out of the message.
  const m = err.message?.match(/index:\s+(\w+?)_\d+/);
  return m ? m[1] : null;
}
