import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCounterKycState } from "@/services/kyc";
import { DashboardShell } from "@/components/DashboardShell";
import { KhatiShell } from "@/components/KhatiShell";
import { NAV } from "@/lib/nav";

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

  // Khatis use the mobile-first shell (bottom nav) everywhere, including here.
  if (user.role === "khati") {
    return <KhatiShell user={shellUser}>{children}</KhatiShell>;
  }

  return (
    <DashboardShell navItems={NAV[user.role]} user={shellUser}>
      {children}
    </DashboardShell>
  );
}
