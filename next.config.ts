import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
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
