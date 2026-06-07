import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/models/User";
import { ROLE_HOME, canAccessPath } from "@/lib/rbac";

/**
 * Edge-safe auth config (NO database / Node-only imports here).
 * Used by middleware for route gating. Providers are added in `auth.ts`,
 * which runs in the Node runtime where Mongoose/bcrypt are available.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Propagate id + role into the JWT and session.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    // Route protection (runs in middleware).
    authorized({ auth, request: { nextUrl } }) {
      const role = auth?.user?.role as UserRole | undefined;
      const path = nextUrl.pathname;

      // Logged-in users hitting a login page → bounce to their home.
      if (path.startsWith("/login")) {
        if (role) return Response.redirect(new URL(ROLE_HOME[role], nextUrl));
        return true;
      }

      return canAccessPath(role, path);
    },
  },
} satisfies NextAuthConfig;
