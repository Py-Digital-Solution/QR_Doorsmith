import type { UserRole } from "@/models/User";
import type { IconName } from "@/components/ui/icons";

export type NavItem = { href: string; label: string; icon: IconName };

/** Sidebar navigation per role. Grows as later phases add sections. */
export const NAV: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/products", label: "Products", icon: "package" },
    { href: "/admin/qr", label: "QR Codes", icon: "qr-code" },
    { href: "/admin/dispatch", label: "Dispatch", icon: "truck" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ],
  sales_rep: [{ href: "/sales", label: "Counters", icon: "store" }],
  distributor: [{ href: "/sales", label: "Counters", icon: "store" }],
  counter: [
    { href: "/counter", label: "Dashboard", icon: "dashboard" },
    { href: "/counter/inventory", label: "Inventory", icon: "boxes" },
    { href: "/counter/dispatches", label: "Dispatches", icon: "truck" },
    { href: "/counter/redemptions", label: "Redemptions", icon: "gift" },
  ],
  khati: [
    { href: "/khati", label: "Home", icon: "home" },
    { href: "/khati/scan", label: "Scan QR", icon: "scan" },
    { href: "/khati/history", label: "History", icon: "history" },
    { href: "/khati/redemptions", label: "Redeem", icon: "coins" },
  ],
};
