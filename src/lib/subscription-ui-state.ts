import type { MeForRouting, SubscriptionStatus } from "@/lib/subscription-access";

export type LatestPaymentStatus = "REJECTED" | "PENDING_REVIEW" | null;

/**
 * Single dashboard subscription banner lane (mutually exclusive).
 * `none` = no subscription strip (e.g. ACTIVE).
 */
export type SubscriptionUIState =
  | "rejected"
  | "pending_review"
  | "grace"
  | "expired"
  | "inactive"
  | "none";

/**
 * Resolves a single dashboard banner lane.
 * Latest payment / candidate PENDING_REVIEW takes precedence over GRACE for messaging
 * (see payment-submitted banner in dashboard layout).
 */
export function resolveSubscriptionUIState(
  subscriptionStatus: SubscriptionStatus,
  latestPaymentStatus: LatestPaymentStatus | undefined | null
): SubscriptionUIState {
  const lps = latestPaymentStatus ?? null;
  if (lps === "REJECTED") return "rejected";
  if (lps === "PENDING_REVIEW") return "pending_review";
  if (subscriptionStatus === "REJECTED") return "rejected";
  if (subscriptionStatus === "PENDING_REVIEW") return "pending_review";
  if (subscriptionStatus === "GRACE") return "grace";
  if (subscriptionStatus === "EXPIRED") return "expired";
  if (subscriptionStatus === "NONE") return "inactive";
  return "none";
}

export function resolveSubscriptionUIStateFromMe(me: MeForRouting): SubscriptionUIState {
  return resolveSubscriptionUIState(
    me.subscription.subscription_status,
    me.latest_payment_status ?? null
  );
}

/** True if calendar paid period still applies (top-level or DB ACTIVE row on auth/me). */
export function meInPaidCalendarWindow(me: MeForRouting): boolean {
  const st = me.subscription?.subscription_status;
  if (st === "ACTIVE" || st === "GRACE") return true;
  const cal = me.subscription?.active_row_calendar_status;
  return cal === "ACTIVE" || cal === "GRACE";
}

/**
 * Networking: block API key actions only for blocking pending review (not while still ACTIVE/GRACE).
 */
export function isNetworkingStoreUnderReview(me: MeForRouting): boolean {
  if (resolveSubscriptionUIStateFromMe(me) !== "pending_review") return false;
  if (meInPaidCalendarWindow(me)) return false;
  return true;
}

export type BillingSettingsStatusKey =
  | "statusActive"
  | "statusInactive"
  | "statusGrace"
  | "statusExpired"
  | "statusPendingReview"
  | "statusRejected";

/** Settings billing row label key under `settings.billing.*`. */
export function billingSettingsStatusKey(
  ui: SubscriptionUIState,
  subscriptionStatus: SubscriptionStatus
): BillingSettingsStatusKey {
  switch (ui) {
    case "rejected":
      return "statusRejected";
    case "pending_review":
      return "statusPendingReview";
    case "grace":
      return "statusGrace";
    case "expired":
      return "statusExpired";
    case "inactive":
      return "statusInactive";
    case "none":
    default:
      return subscriptionStatus === "ACTIVE" ? "statusActive" : "statusInactive";
  }
}
