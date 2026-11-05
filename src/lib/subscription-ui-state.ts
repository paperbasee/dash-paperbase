import type { MeForRouting, SubscriptionStatus } from "@/lib/subscription-access";

export type LatestPaymentStatus = "REJECTED" | "PENDING_REVIEW" | null;

/**
 * Single dashboard subscription banner lane (mutually exclusive).
 * `none` = no subscription strip (e.g. ACTIVE).
 */
export type SubscriptionUIState =
  | "rejected"
  | "pending_review"
  | "expired"
  | "inactive"
  | "trial"
  | "none";

/**
 * Resolves a single dashboard banner lane.
 * Latest payment / candidate PENDING_REVIEW takes precedence for messaging
 * (see payment-submitted banner in dashboard layout).
 */
export function resolveSubscriptionUIState(
  subscriptionStatus: SubscriptionStatus,
  latestPaymentStatus: LatestPaymentStatus | undefined | null,
  /** Optional: an ACTIVE trial gets its own countdown lane instead of no banner. */
  isTrial?: boolean
): SubscriptionUIState {
  const lps = latestPaymentStatus ?? null;
  if (lps === "REJECTED") return "rejected";
  if (lps === "PENDING_REVIEW") return "pending_review";
  if (subscriptionStatus === "REJECTED") return "rejected";
  if (subscriptionStatus === "PENDING_REVIEW") return "pending_review";
  if (subscriptionStatus === "EXPIRED") return "expired";
  if (subscriptionStatus === "NONE") return "inactive";
  // Only an ACTIVE trial: once it lapses the expired lane above takes over,
  // so a merchant never sees "trial ends in N days" on a dead storefront.
  if (isTrial && subscriptionStatus === "ACTIVE") return "trial";
  return "none";
}

export function resolveSubscriptionUIStateFromMe(me: MeForRouting): SubscriptionUIState {
  return resolveSubscriptionUIState(
    me.subscription.subscription_status,
    me.latest_payment_status ?? null,
    me.subscription.is_trial === true
  );
}

/** True while a paid period runs (top-level or DB ACTIVE row on auth/me). */
export function meInPaidCalendarWindow(me: MeForRouting): boolean {
  return me.subscription?.subscription_status === "ACTIVE" || me.subscription?.active_row_calendar_status === "ACTIVE";
}

/**
 * Networking: block API key actions only for blocking pending review (not while a paid period runs).
 */
export function isNetworkingStoreUnderReview(me: MeForRouting): boolean {
  if (resolveSubscriptionUIStateFromMe(me) !== "pending_review") return false;
  if (meInPaidCalendarWindow(me)) return false;
  return true;
}
