import {
  clearMeProfileCache,
  ensureMeProfile,
} from "@/lib/me-profile-store";

export type SubscriptionStatus =
  | "NONE"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "ACTIVE"
  | "GRACE"
  | "EXPIRED";

export interface MeSubscription {
  subscription_status: SubscriptionStatus;
  plan: string | null;
  /** For renew / checkout (billing payment initiate). */
  plan_public_id: string | null;
  end_date: string | null;
  days_remaining: number;
  /** ISO 8601 instant when storefront API keys start receiving subscription_expired (BD calendar). */
  storefront_blocks_at?: string | null;
  /**
   * Calendar state of the latest DB ACTIVE subscription row (if any).
   * When renewal is PENDING_REVIEW, this can be ACTIVE/GRACE while `subscription_status` stays PENDING_REVIEW.
   */
  active_row_calendar_status?: SubscriptionStatus | null;
}

export interface MeForRouting {
  /** User public_id from auth/me/; used for cache key when JWT omits user_public_id. */
  public_id?: string;
  active_store_public_id: string | null;
  /** True when the user owns a suspended / pending-delete store that can be restored. */
  has_recoverable_stores?: boolean;
  /**
   * Latest subscription row by server `updated_at` (REJECTED / PENDING_REVIEW only).
   * Distinct from `subscription.subscription_status` (candidate row / calendar).
   */
  latest_payment_status: "REJECTED" | "PENDING_REVIEW" | null;
  subscription: MeSubscription;
  /** Single store summary for the current user (owner or staff). */
  store?: {
    public_id: string;
    name: string;
    role: string;
  } | null;
}

/** True when the user has a subscription row other than NONE/REJECTED (banners, onboarding eligibility). */
export function hasSubscriptionPlan(me: MeForRouting): boolean {
  const s = me.subscription?.subscription_status;
  return s !== "NONE" && s !== "REJECTED";
}

/** Calendar-active paid period (excludes EXPIRED and NONE). */
export function subscriptionIsPaidPeriod(me: MeForRouting): boolean {
  const s = me.subscription?.subscription_status;
  if (s === "ACTIVE" || s === "GRACE") return true;
  const cal = me.subscription?.active_row_calendar_status;
  return cal === "ACTIVE" || cal === "GRACE";
}

/** Clear cached auth/me (logout, store deletion, etc.). */
export function invalidateMeRoutingCache(): void {
  clearMeProfileCache();
}

/** Loads profile via ensureMeProfile (session + deduped network). */
export async function fetchMeForRouting(): Promise<MeForRouting> {
  return ensureMeProfile();
}

export type PostAuthPath =
  | "/"
  | "/onboarding"
  | "/onboarding/create-store"
  | "/recover";

/**
 * Where to send the user after login / 2FA, using server truth from auth/me/.
 * Subscription status does not gate routing; inactive plans are surfaced in-dashboard only.
 */
export function resolvePostAuthPath(me: MeForRouting): PostAuthPath {
  if (me.active_store_public_id) {
    return "/";
  }
  if (me.has_recoverable_stores === true) {
    return "/recover";
  }
  /** Dashboard is never gated by subscription; pending payment is surfaced in-app only. */
  return "/onboarding";
}

export type PostAuthRouteResult =
  | { ok: true; path: PostAuthPath; me: MeForRouting }
  | { ok: false; kind: "fetch_error" };

export async function resolvePostAuthRoute(): Promise<PostAuthRouteResult> {
  try {
    const me = await ensureMeProfile();
    return { ok: true, path: resolvePostAuthPath(me), me };
  } catch {
    return { ok: false, kind: "fetch_error" };
  }
}
