import type { UserRole } from "@/models/User";

/**
 * Role-based access helpers (SOW 1.2 hierarchy):
 *   admin → sales_rep → distributor → counter → khati
 */

/** Landing route for each role after login. */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin/users",
  sales_rep: "/sales",
  distributor: "/sales", // distributor shares the sales-style area
  counter: "/counter",
  khati: "/khati",
};

/** Which roles each role is allowed to create (admin user management, SOW 1.2). */
export const CAN_CREATE: Record<UserRole, UserRole[]> = {
  admin: ["sales_rep", "distributor", "counter", "khati"],
  sales_rep: ["counter"],
  distributor: ["counter"], // can register counters, but NOT approve khatis
  counter: ["khati"],
  khati: [],
};

export function canCreate(actor: UserRole, target: UserRole): boolean {
  return CAN_CREATE[actor]?.includes(target) ?? false;
}

/** Route-prefix → roles permitted to access it. */
export const AREA_ROLES: Record<string, UserRole[]> = {
  "/admin": ["admin"],
  "/sales": ["sales_rep", "distributor"],
  "/counter": ["counter"],
  "/khati": ["khati"],
};

/** Returns the area prefix a path belongs to, or null if public. */
export function areaForPath(path: string): string | null {
  return Object.keys(AREA_ROLES).find((prefix) => path.startsWith(prefix)) ?? null;
}

export function canAccessPath(role: UserRole | undefined, path: string): boolean {
  const area = areaForPath(path);
  if (!area) return true; // public path
  if (!role) return false;
  return AREA_ROLES[area].includes(role);
}
