import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getCounterKycState } from "@/services/kyc";
import { DashboardShell } from "@/components/DashboardShell";
import { NAV } from "@/lib/nav";

export default async function CounterLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["counter"]);

  // First-login KYC gate: counters must add a photo + address before using the app.
  const kyc = await getCounterKycState(user.id);
  if (!kyc.completed) redirect("/counter-kyc");

  return (
    <DashboardShell
      navItems={NAV.counter}
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
    >
      {children}
    </DashboardShell>
  );
}
