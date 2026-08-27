import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCounterKycState } from "@/services/kyc";
import { DashboardShell } from "@/components/DashboardShell";
import { KhatiShell } from "@/components/KhatiShell";
import { NAV, getNavForRole } from "@/lib/nav";
import { getCompanyBranding } from "@/services/branding";
import { getFeatureSettings } from "@/services/settings";
import { getBannerSettings } from "@/services/banner";

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;

  // Counters must finish first-login KYC before reaching any in-app page.
  if (user.role === "counter") {
    const kyc = await getCounterKycState(user.id);
    if (!kyc.completed) redirect("/counter-kyc");
  }
  const shellUser = {
    name: user.name ?? undefined,
    email: user.email ?? undefined,
    role: user.role,
  };

  const [branding, features, banner] = await Promise.all([
    getCompanyBranding(),
    getFeatureSettings(),
    getBannerSettings(),
  ]);
  const activeBanner = banner.enabled && banner.image ? banner : null;

  // Khatis use the mobile-first shell (bottom nav) everywhere, including here.
  if (user.role === "khati") {
    return <KhatiShell user={shellUser} banner={activeBanner}>{children}</KhatiShell>;
  }

  return (
    <DashboardShell
      navItems={getNavForRole(user.role, features)}
      user={shellUser}
      branding={branding}
      banner={activeBanner}
    >
      {children}
    </DashboardShell>
  );
}
