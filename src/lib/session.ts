import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/rbac";
import type { UserRole } from "@/models/User";

/**
 * Server-side guard for role-scoped areas. Redirects to /login if not signed in,
 * or to the user's own home if they hit an area they're not allowed in.
 */
export async function requireRole(allowed: UserRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!allowed.includes(session.user.role)) {
    redirect(ROLE_HOME[session.user.role]);
  }
  return session.user;
}
