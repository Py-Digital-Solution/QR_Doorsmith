import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { KhatiShell } from "@/components/KhatiShell";

export default async function KhatiLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["khati"]);
  return (
    <KhatiShell user={{ name: user.name ?? undefined, email: user.email ?? undefined, role: user.role }}>
      {children}
    </KhatiShell>
  );
}
