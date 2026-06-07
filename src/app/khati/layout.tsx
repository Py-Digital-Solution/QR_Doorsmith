import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/DashboardShell";
import { NAV } from "@/lib/nav";

export default async function KhatiLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["khati"]);
  return (
    <DashboardShell
      navItems={NAV.khati}
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
    >
      {children}
    </DashboardShell>
  );
}
