import type { UserRole } from "@/models/User";

export type NavItem = { href: string; label: string };

/** Sidebar navigation per role. Grows as later phases add sections. */
export const NAV: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/qr", label: "QR Codes" },
    { href: "/admin/dispatch", label: "Dispatch" },
    { href: "/admin/settings", label: "Settings" },
  ],
  sales_rep: [{ href: "/sales", label: "Counters" }],
  distributor: [{ href: "/sales", label: "Counters" }],
  counter: [{ href: "/counter", label: "Khatis" }],
  khati: [{ href: "/khati", label: "Home" }],
};
