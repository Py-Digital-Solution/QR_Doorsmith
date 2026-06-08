import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Behind Netlify's proxy the `x-forwarded-host` (the public domain) doesn't
    // match the internal `origin`, so Next.js's Server Actions CSRF guard blocks
    // the request with a 500 — which Auth.js surfaces on the login form as
    // "An unexpected response was received from the server". Whitelisting the
    // deployed origins fixes login (and every other Server Action) on Netlify.
    serverActions: {
      allowedOrigins: [
        "qrdoorsmith.netlify.app",
        "*.netlify.app", // Netlify deploy previews / branch deploys
        "doorsmith.in",
        "*.doorsmith.in",
      ],
    },
  },
};

export default nextConfig;
