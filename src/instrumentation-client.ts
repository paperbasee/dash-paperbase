/**
 * Browser-side Sentry, loaded before the app hydrates.
 *
 * The environment is resolved from the live hostname here rather than a baked
 * NEXT_PUBLIC_* value, so one promoted image reports staging as staging.
 */
import * as Sentry from "@sentry/nextjs";

import { baseOptions, sentryEnabled } from "./sentry-config";

if (sentryEnabled()) {
  Sentry.init(baseOptions(window.location.hostname));
}

/** Powers navigation breadcrumbs; harmless when init above was skipped. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
