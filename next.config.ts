import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

// In development the Django API runs on http://localhost — allow it explicitly.
// In production this should be your actual API domain (e.g. https://api.yourdomain.com).
const apiOrigin = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : isDev
  ? "http://localhost:8000"
  : "";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // Content-Security-Policy — tighten as third-party integrations are confirmed.
    // 'unsafe-inline' is required for Tailwind/styled-jsx in development;
    // replace with a nonce-based CSP before production.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Cloudflare Turnstile (widget script + challenge iframe)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "frame-src 'self' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: ${apiOrigin}`,
      "font-src 'self' data:",
      // Allow the backend API origin explicitly (http in dev, https in prod).
      `connect-src 'self' https: ${apiOrigin} https://challenges.cloudflare.com`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
