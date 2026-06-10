import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Next.js 16 renamed middleware → proxy. Export as named `proxy` (or default).
export const proxy = auth;

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
