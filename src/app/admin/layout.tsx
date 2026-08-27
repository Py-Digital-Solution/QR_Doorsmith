import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/DashboardShell";
import { NAV, getNavForRole } from "@/lib/nav";
import { getCompanyBranding } from "@/services/branding";
import { getFeatureSettings } from "@/services/settings";
import { getBannerSettings } from "@/services/banner";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["admin", "super_admin"]);
  const [branding, features, banner] = await Promise.all([
    getCompanyBranding(),
    getFeatureSettings(),
    getBannerSettings(),
  ]);
  const activeBanner = banner.enabled && banner.image ? banner : null;
  const navItems = getNavForRole(user.role === "super_admin" ? "admin" : user.role, features);
  return (
    <DashboardShell
      navItems={navItems}
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
      branding={branding}
      banner={activeBanner}
    >
      {children}
    </DashboardShell>
  );
}
