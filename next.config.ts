import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // The Next/Turbopack build type-checker pulls in TS source from some deps
    // (e.g. @auth/core .tsx, zod test files) that don't compile under React 19's
    // types. Our OWN code is type-checked separately via `npm run typecheck`.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
