import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

// In development the Django API runs on http://localhost — allow it explicitly.
// In production this should be your actual API domain (e.g. https://api.yourdomain.com).
const apiOrigin = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : isDev
  ? "http://localhost:8000"
  : "";

const wsOrigin = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
      .replace(/^http/, "ws")
  : isDev
  ? "ws://localhost:8000"
  : "";

/**
 * Sentry's ingest origin, taken from the DSN so the CSP cannot drift from it.
 * Empty when no DSN is configured, which keeps the header byte-identical to
 * before on any instance that does not use Sentry.
 */
const sentryIngest = (() => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return "";
  try {
    return new URL(dsn).origin;
  } catch {
    return "";
  }
})();

const cspReportUri = apiOrigin
  ? `report-uri ${apiOrigin}/api/v1/csp-report/?app=dash`
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
    key: "Accept-CH",
    value: "Sec-CH-Prefers-Color-Scheme",
  },
  {
    // Content-Security-Policy — tighten as third-party integrations are confirmed.
    // 'unsafe-inline' is required for Tailwind/styled-jsx in development;
    // replace with a nonce-based CSP before production.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Cloudflare Turnstile (widget script + challenge iframe)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
      "frame-src 'self' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: ${apiOrigin}`,
      "font-src 'self' data:",
      // Allow the backend API origin explicitly (http in dev, https in prod).
      `connect-src 'self' ${apiOrigin} ${wsOrigin} https://challenges.cloudflare.com https://*.r2.cloudflarestorage.com ${sentryIngest}`,
      "frame-ancestors 'none'",
      ...(cspReportUri ? [cspReportUri] : []),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.NEXT_PUBLIC_BUILD_ID ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      "dev",
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@phosphor-icons/react",
      "recharts",
      "next-intl",
      "radix-ui",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "paperbaseme",
  project: "dashboard-paperbase",
  // Quiet unless something is wrong.
  silent: !process.env.CI,
  // Source maps upload only when a build is given a token. Without one the
  // build still succeeds -- it just reports minified frames -- so adding the
  // token later is a CI change, not a code change.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Routes browser reports through this app's own origin, so an ad blocker
  // cutting requests to sentry.io does not silently erase merchant errors.
  tunnelRoute: "/monitoring",
});
