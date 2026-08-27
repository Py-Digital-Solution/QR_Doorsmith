import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { getBannerSettings } from "@/services/banner";
import { getFeatureSettings } from "@/services/settings";
import { getNavForRole } from "@/lib/nav";
import { KhatiShell } from "@/components/KhatiShell";

export default async function KhatiLayout({ children }: { children: ReactNode }) {
  const [user, banner, features] = await Promise.all([
    requireRole(["khati"]),
    getBannerSettings(),
    getFeatureSettings(),
  ]);
  const activeBanner = banner.enabled && banner.image ? banner : null;
  const navItems = getNavForRole("khati", features);

  return (
    <KhatiShell
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
      banner={activeBanner}
      navItems={navItems}
      redemptionsEnabled={features.redemptions_enabled}
    >
      {children}
    </KhatiShell>
  );
}
