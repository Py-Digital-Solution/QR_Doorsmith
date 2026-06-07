/** True for a MongoDB duplicate-key error (unique index violation). */
export function isDuplicateKeyError(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    (e as { code?: number }).code === 11000
  );
}
