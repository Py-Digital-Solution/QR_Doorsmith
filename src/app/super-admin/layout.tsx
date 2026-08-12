import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/DashboardShell";
import { NAV } from "@/lib/nav";
import { getCompanyBranding } from "@/services/branding";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["super_admin"]);
  const branding = await getCompanyBranding();
  return (
    <DashboardShell
      navItems={NAV.super_admin}
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
      branding={branding}
    >
      {children}
    </DashboardShell>
  );
}
