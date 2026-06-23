import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Behind reverse proxies (Netlify, Vercel) the `x-forwarded-host` doesn't
    // match the internal `origin`, so Next.js's Server Actions CSRF guard blocks
    // requests with a 500. Whitelisting deployed origins fixes login and every
    // other Server Action on both platforms.
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        // Netlify
        "qrdoorsmith.netlify.app",
        "*.netlify.app",
        // Vercel
        "qr-doorsmith.vercel.app",
        "*.vercel.app",
        // Custom domain
        "doorsmith.in",
        "*.doorsmith.in",
      ],
    },
  },
};

export default nextConfig;
