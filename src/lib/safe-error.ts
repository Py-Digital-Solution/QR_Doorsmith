import { logger } from "@/lib/logger";

/**
 * Logs the full error server-side and returns a safe, user-facing message.
 * Prevents internal implementation details (stack traces, DB paths) from
 * leaking to the client.
 *
 * Use in all server action catch blocks:
 *   return { error: safeError(e, "Failed to create user") };
 */
export function safeError(
  err: unknown,
  fallback: string,
  context?: Record<string, unknown>,
): string {
  const message = err instanceof Error ? err.message : String(err);

  // Log the full error server-side
  logger.error(fallback, {
    error: message,
    stack: err instanceof Error ? err.stack : undefined,
    ...context,
  });

  // Return the actual error message only for known, safe business errors.
  // These are errors we deliberately throw with user-facing text.
  // Mongoose/DB/system errors get the generic fallback.
  const SAFE_PREFIXES = [
    "A user with",
    "Email and password",
    "Phone",
    "SKU is required",
    "Name is required",
    "MRP must",
    "Sales price",
    "Reward points",
    "Product not found",
    "User not found",
    "You are not",
    "You cannot",
    "Only an admin",
    "Please select",
    "This karigar",
    "Another product",
    "A product with",
    "An organization",
    "Name and Slug",
    "All fields",
    "Access denied",
    "Not authorized",
    "Registration link",
    "Distributor role",
    "cannot create",
    "Invalid",
    "required",
    "must be",
    "Password must",
  ];

  if (SAFE_PREFIXES.some((prefix) => message.startsWith(prefix) || message.includes(prefix))) {
    return message;
  }

  return fallback;
}
