import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { getBannerSettings } from "@/services/banner";
import { KhatiShell } from "@/components/KhatiShell";

export default async function KhatiLayout({ children }: { children: ReactNode }) {
  const [user, banner] = await Promise.all([
    requireRole(["khati"]),
    getBannerSettings(),
  ]);
  const activeBanner = banner.enabled && banner.image ? banner : null;
  return (
    <KhatiShell
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
      banner={activeBanner}
    >
      {children}
    </KhatiShell>
  );
}
