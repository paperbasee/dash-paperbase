import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";
import { dashboardFrameSrc, previewOrigin } from "./src/lib/theme-editor/preview-origin";
import { devMediaOrigin } from "./src/lib/dev-media-origin";

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

// Local MinIO in development: pictures load from it and direct uploads PUT to
// it. Empty in production, whose media is https (R2) and already allowed.
const mediaOrigin = devMediaOrigin(isDev, process.env.NEXT_PUBLIC_MEDIA_BASE_URL);
const withMedia = mediaOrigin ? ` ${mediaOrigin}` : "";

// Accounts, where everyone signs in: the page trades its code for the pass, renews the pass and
// signs out there (src/lib/accounts).
const accountsOrigin = process.env.NEXT_PUBLIC_ACCOUNTS_URL
  ? ` ${new URL(process.env.NEXT_PUBLIC_ACCOUNTS_URL).origin}`
  : isDev
  ? " http://localhost:4400"
  : "";

// Paperbase's status page: the dashboard reads its summary for the notice across the top.
const statusOrigin = process.env.NEXT_PUBLIC_STATUS_URL
  ? ` ${new URL(process.env.NEXT_PUBLIC_STATUS_URL).origin}`
  : "";

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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
      // Theme editor: the storefront preview host, only when NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN is set.
      dashboardFrameSrc(previewOrigin(process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN)),
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: ${apiOrigin}${withMedia}`,
      "font-src 'self' data:",
      // Allow the backend API origin explicitly (http in dev, https in prod).
      `connect-src 'self' ${apiOrigin}${accountsOrigin}${withMedia}${statusOrigin} ${wsOrigin} https://*.r2.cloudflarestorage.com ${sentryIngest}`,
      "frame-ancestors 'none'",
      ...(cspReportUri ? [cspReportUri] : []),
    ].join("; "),
  },
];

// What busts the persisted react-query cache (see QueryProvider).
//
// In production this is the commit, so a deploy throws away anything cached
// against the old code -- which is what stops a merchant's browser restoring a
// response in a shape the API no longer sends.
//
// In development it used to be the literal string "dev", which never changes.
// That meant a cached response outlived every code change: alter a response
// shape and the browser goes on restoring the old one from IndexedDB, for
// fifteen days, with no way to tell that from a real bug. It cost an afternoon
// on the most-wished-for list, which came back as a paginated object long after
// the endpoint had stopped sending one.
//
// So in development it changes whenever the dev server starts. Reloading then
// refetches, which is the right trade there: dev wants the truth, not speed.
const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  (process.env.NODE_ENV === "production" ? "production" : `dev-${Date.now()}`);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  // No early "Link: rel=preload" headers. The stylesheet is the first thing in
  // every page's <head>, so the header wins nothing -- and on the dashboard,
  // whose first screen waits for the sign-in, the browser reported the
  // preloaded stylesheet as unused.
  reactMaxHeadersLength: 0,
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
      {
        // The passkey permission file (public/.well-known/webauthn; guidelines/accounts-plan.md,
        // section 9): browsers read it as JSON, which a file without an extension is not served as.
        source: "/.well-known/webauthn",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // The organization `paperbasee` and its project `dash-paperbase` (renamed
  // from dashboard-paperbase on 2026-10-08; guidelines/monitoring-sentry.md).
  org: "paperbasee",
  project: "dash-paperbase",
  // A production build records its release and its deploy under `production`,
  // the environment its errors carry. Left to itself the plugin names the deploy
  // `vercel-production`, a second name for the same thing. Any other build
  // (a Vercel preview, a local one) creates no release: nothing but production
  // ever reaches merchants.
  release:
    process.env.VERCEL_TARGET_ENV === "production"
      ? { deploy: { env: "production" } }
      : { create: false },
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
