import type { UserRole } from "@/models/User";
import type { IconName } from "@/components/ui/icons";

export type NavItem = { href: string; label: string; icon: IconName };

/** Sidebar navigation per role. Grows as later phases add sections. */
export const NAV: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin/dashboards/overview", label: "Overview", icon: "dashboard" },
    { href: "/admin/dashboards/ledger", label: "Points Ledger", icon: "receipt" },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/products", label: "Products", icon: "package" },
    { href: "/admin/qr", label: "QR Codes", icon: "qr-code" },
    { href: "/admin/dispatch", label: "Dispatch", icon: "truck" },
    { href: "/admin/returns", label: "Returns", icon: "undo" },
    { href: "/approvals", label: "Approvals", icon: "user-check" },
    { href: "/admin/audit", label: "Audit Log", icon: "history" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ],
  sales_rep: [
    { href: "/sales/dashboard", label: "Overview", icon: "dashboard" },
    { href: "/sales/ledger", label: "Points Ledger", icon: "receipt" },
    { href: "/sales", label: "Counters", icon: "store" },
    { href: "/approvals", label: "Approvals", icon: "user-check" },
  ],
  distributor: [
    { href: "/sales/dashboard", label: "Overview", icon: "dashboard" },
    { href: "/sales/ledger", label: "Points Ledger", icon: "receipt" },
    { href: "/sales", label: "Counters", icon: "store" },
    { href: "/approvals", label: "Approvals", icon: "user-check" },
  ],
  counter: [
    { href: "/counter/dashboard", label: "Dashboard", icon: "bar-chart" },
    { href: "/counter", label: "Khatis", icon: "users" },
    { href: "/counter/inventory", label: "Inventory", icon: "boxes" },
    { href: "/counter/dispatches", label: "Dispatches", icon: "truck" },
    { href: "/counter/redemptions", label: "Redemptions", icon: "gift" },
    { href: "/counter/returns", label: "Returns", icon: "undo" },
    { href: "/counter/kyc", label: "Approvals", icon: "user-check" },
  ],
  khati: [
    { href: "/khati", label: "Home", icon: "home" },
    { href: "/khati/scan", label: "Scan QR", icon: "scan" },
    { href: "/khati/history", label: "History", icon: "history" },
    { href: "/khati/redemptions", label: "Redeem", icon: "coins" },
    { href: "/khati/products", label: "Products", icon: "play-circle" },
  ],
};
