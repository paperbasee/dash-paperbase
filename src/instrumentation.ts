/**
 * Server-side process setup. Next runs this once per runtime before any
 * request is handled.
 */
import * as Sentry from "@sentry/nextjs";

import { baseOptions, sentryEnabled } from "./sentry-config";

export async function register() {
  if (!sentryEnabled()) return;
  // No hostname on the server: resolveEnvironment falls back to the explicit
  // variable, which the server process reads at RUNTIME rather than build time.
  Sentry.init(baseOptions());
}

/**
 * Next 15+ hands server-component and route-handler errors here. Without it
 * a React Server Component that throws is logged to stdout and nowhere else.
 */
export const onRequestError = Sentry.captureRequestError;
