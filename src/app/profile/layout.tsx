import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { NAV } from "@/lib/nav";

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  return (
    <DashboardShell
      navItems={NAV[user.role]}
      user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}
    >
      {children}
    </DashboardShell>
  );
}
