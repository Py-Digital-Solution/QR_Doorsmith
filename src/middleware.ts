import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses only the JWT (no DB) to gate routes via the
// `authorized` callback in authConfig.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    "/admin/:path*",
    "/sales/:path*",
    "/counter/:path*",
    "/khati/:path*",
    "/login",
    "/login/:path*",
  ],
};
