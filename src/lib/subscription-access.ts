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
}

export interface MeForRouting {
  /** User public_id from auth/me/; used for cache key when JWT omits user_public_id. */
  public_id?: string;
  active_store_public_id: string | null;
  /** True when the user owns a suspended / pending-delete store that can be restored. */
  has_recoverable_stores?: boolean;
  subscription: MeSubscription;
  /** Single store summary for the current user (owner or staff). */
  store?: {
    public_id: string;
    name: string;
    role: string;
  } | null;
}

/** True when the user may access plan/onboarding flows (excludes never-subscribed and rejected). */
export function hasSubscriptionPlan(me: MeForRouting): boolean {
  const s = me.subscription?.subscription_status;
  return s !== "NONE" && s !== "REJECTED";
}

/** Calendar-active paid period (excludes EXPIRED and NONE). */
export function subscriptionIsPaidPeriod(me: MeForRouting): boolean {
  const s = me.subscription?.subscription_status;
  return s === "ACTIVE" || s === "GRACE";
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
  | "/plan-not-active"
  | "/recover";

/**
 * Where to send the user after login / 2FA, using server truth from auth/me/.
 */
export function resolvePostAuthPath(me: MeForRouting): PostAuthPath {
  if (!hasSubscriptionPlan(me)) {
    return "/plan-not-active";
  }
  if (me.active_store_public_id) {
    return "/";
  }
  if (me.has_recoverable_stores === true) {
    return "/recover";
  }
  if (me.subscription?.subscription_status === "PENDING_REVIEW") {
    return "/onboarding/create-store";
  }
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
