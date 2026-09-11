/**
 * Shared Sentry wiring for every runtime in this app (browser, node, edge).
 *
 * Errors only. traces/profiles/replay stay at zero, matching the API in
 * config/settings/runtime.py -- turning any of them on is a billing and a
 * bundle-size decision, not a default.
 */
import type { init as SentryInit } from "@sentry/nextjs";

type InitOptions = Parameters<typeof SentryInit>[0];

/** Public by design: a DSN is an ingest address, not a secret, and the browser needs it. */
const DSN = (process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim();

/**
 * Which environment an event belongs to.
 *
 * The explicit variable wins. When it is absent we derive from the hostname
 * rather than defaulting to "production", because NEXT_PUBLIC_* is inlined at
 * BUILD time: one image promoted from staging to production (guidelines/
 * releasing-safely.md, "build once, ship that same build") would otherwise
 * carry a single baked-in value and file every staging error under production.
 * Guessing from the host is not elegant, but its failure mode is safe --
 * an unrecognised host reads as production, so a real production error is
 * never hidden in a staging bucket.
 */
export function resolveEnvironment(hostname?: string): string {
  const explicit = (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.SENTRY_ENVIRONMENT ??
    ""
  ).trim();
  if (explicit) return explicit;

  const host = (hostname ?? "").toLowerCase();
  if (!host) return "production";
  if (host === "localhost" || host.endsWith(".localhost") || host.startsWith("127.")) {
    return "development";
  }
  if (host.includes("staging") || host.includes("stg")) return "staging";
  return "production";
}

/**
 * Off unless a DSN is present AND we are not in development -- the same two
 * guards the API uses, so a developer's stack traces never reach the shared
 * project and local noise never counts against quota.
 */
export function sentryEnabled(): boolean {
  if (!DSN) return false;
  if (process.env.NODE_ENV === "development") return false;
  return (process.env.NEXT_PUBLIC_SENTRY_ENABLED ?? "1").trim() !== "0";
}

export function baseOptions(hostname?: string): InitOptions {
  return {
    dsn: DSN,
    environment: resolveEnvironment(hostname),
    release: (process.env.NEXT_PUBLIC_BUILD_ID ?? "").trim() || undefined,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    // The dashboard carries merchant data. Sentry's default scrubbing covers
    // passwords and tokens, but nothing here needs request bodies attached.
    sendDefaultPii: false,
    ignoreErrors: [
      // Fired when a user navigates away mid-request. Not a defect, and at
      // merchant volumes it would drown everything that is.
      "AbortError",
      "Non-Error promise rejection captured",
      "ResizeObserver loop completed with undelivered notifications",
    ],
  };
}
