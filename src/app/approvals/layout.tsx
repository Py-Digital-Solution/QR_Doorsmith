import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/DashboardShell";
import { NAV } from "@/lib/nav";

export default async function ApprovalsLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["admin", "sales_rep", "distributor"]);
  return (
    <DashboardShell
      navItems={NAV[user.role]}
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
    >
      {children}
    </DashboardShell>
  );
}
