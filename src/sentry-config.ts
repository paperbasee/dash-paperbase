/**
 * Shared Sentry wiring for every runtime in this app (browser, node, edge).
 *
 * Errors only. traces/profiles/replay stay off, matching the API in
 * config/settings/runtime.py -- turning any of them on is a billing and a
 * bundle-size decision, not a default.
 */
import type { init as SentryInit } from "@sentry/nextjs";

type InitOptions = Parameters<typeof SentryInit>[0];

/** Public by design: a DSN is an ingest address, not a secret, and the browser needs it. */
const DSN = (process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim();

/** Header and query names that carry a person's address: never sent. */
const ADDRESS_KEYS = ["forwarded", "-ip", "remote-", "via", "-user"];

/**
 * Which environment an event belongs to.
 *
 * The explicit variable wins. Without it, a developer's own machine is
 * `development` and everything else is `production`, the only deployed
 * environment since the staging server was removed (2026-09-14). The browser
 * passes its hostname; the server passes none and reads production.
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
    // The dashboard carries merchant data. Sentry 11 collects everything it can
    // unless told otherwise, so this is what Sentry 10 sent with
    // `sendDefaultPii: false` (Sentry's own "keep the v10 defaults"), plus no
    // local variable values, which Sentry 11's server now records by default.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { deny: ADDRESS_KEYS }, response: { deny: ADDRESS_KEYS } },
      httpBodies: [],
      urlQueryParams: { deny: ADDRESS_KEYS },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      graphQL: { document: false, variables: false },
      queues: false,
      stackFrameVariables: false,
    },
    // Sentry 11 adds a made-up stack trace to events that have none, which
    // regroups them; errors keep the groups they had.
    attachStacktrace: false,
    ignoreErrors: [
      // Fired when a user navigates away mid-request. Not a defect, and at
      // merchant volumes it would drown everything that is.
      "AbortError",
      "Non-Error promise rejection captured",
      "ResizeObserver loop completed with undelivered notifications",
    ],
  };
}
