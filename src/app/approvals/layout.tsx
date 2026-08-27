import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/DashboardShell";
import { NAV } from "@/lib/nav";
import { getCompanyBranding } from "@/services/branding";
import { getBannerSettings } from "@/services/banner";

export default async function ApprovalsLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["admin", "distributor"]);
  const [branding, banner] = await Promise.all([
    getCompanyBranding(),
    getBannerSettings(),
  ]);
  const activeBanner = banner.enabled && banner.image ? banner : null;
  return (
    <DashboardShell
      navItems={NAV[user.role]}
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
      branding={branding}
      banner={activeBanner}
    >
      {children}
    </DashboardShell>
  );
}
