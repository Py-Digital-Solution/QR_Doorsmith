import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getCounterKycState } from "@/services/kyc";
import { DashboardShell } from "@/components/DashboardShell";
import { NAV, getNavForRole } from "@/lib/nav";
import { getCompanyBranding } from "@/services/branding";
import { getFeatureSettings } from "@/services/settings";
import { getBannerSettings } from "@/services/banner";

export default async function CounterLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["counter"]);

  // First-login KYC gate: counters must add a photo + address before using the app.
  const kyc = await getCounterKycState(user.id);
  if (!kyc.completed) redirect("/counter-kyc");

  const [branding, features, banner] = await Promise.all([
    getCompanyBranding(),
    getFeatureSettings(),
    getBannerSettings(),
  ]);
  const activeBanner = banner.enabled && banner.image ? banner : null;

  return (
    <DashboardShell
      navItems={getNavForRole(user.role, features)}
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
      branding={branding}
      banner={activeBanner}
    >
      {children}
    </DashboardShell>
  );
}
