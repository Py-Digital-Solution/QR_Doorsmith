/**
 * Pure role/status constants  NO database imports, so this is safe to import
 * from client components as well as server code and CLI scripts.
 */
export const USER_ROLES = [
  "admin",
  "sales_rep",
  "distributor",
  "counter",
  "khati",
] as const;

export const USER_STATUSES = ["active", "pending", "suspended"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
