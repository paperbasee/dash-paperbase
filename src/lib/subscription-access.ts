import {
  clearMeProfileCache,
  ensureMeProfile,
} from "@/lib/me-profile-store";
import { isNetworkError } from "@/lib/network-error";

export type SubscriptionStatus =
  | "NONE"
  | "MODERATOR"
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
  /** True while the store is on the free trial granted at signup. */
  is_trial?: boolean;
  /**
   * Calendar state of the latest DB ACTIVE subscription row (if any).
   * When renewal is PENDING_REVIEW, this can be ACTIVE/GRACE while `subscription_status` stays PENDING_REVIEW.
   */
  active_row_calendar_status?: SubscriptionStatus | null;
}

export interface MeForRouting {
  /** The person's public_id (Accounts' `sub`). */
  public_id?: string;
  /** The face chosen in the person's Paperbase account; "" for their own (public_id). */
  avatar_seed?: string;
  /** Logged-in user's own identity (distinct from the store owner's branding). */
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_moderator?: boolean;
  is_superuser?: boolean;
  active_store_public_id: string | null;
  /** Paperbase support's visit this dashboard is in ("Sign in as this shop"); null for the owner's own sign-in. */
  support_session?: { public_id: string; store_name: string; expires_at: string } | null;
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
    /** Owners only: false while setup is unfinished (the shop is made half-way through it). */
    setup_finished?: boolean;
    /** Owners only: what setup's first step saved, so setup can pick up where it stopped. */
    store_type?: string;
  } | null;
}

/** An owner whose shop was made by setup, and who has not finished it yet. */
export function setupUnfinished(me: MeForRouting): boolean {
  return me.store?.role === "Owner" && me.store.setup_finished === false;
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

/** Clear cached auth/me (logout, etc.). */
export function invalidateMeRoutingCache(): void {
  clearMeProfileCache();
}

/** Loads profile via ensureMeProfile (session + deduped network). */
export async function fetchMeForRouting(): Promise<MeForRouting> {
  return ensureMeProfile();
}

export type PostAuthPath = "/" | "/onboarding";

/**
 * Where to send the user after login / 2FA, using server truth from auth/me/: setup for a user
 * with no shop, or an owner who has not finished setting theirs up; the dashboard otherwise.
 * Subscription status does not gate routing; inactive plans are surfaced in-dashboard only.
 */
export function resolvePostAuthPath(me: MeForRouting): PostAuthPath {
  if (me.active_store_public_id && !setupUnfinished(me)) {
    return "/";
  }
  return "/onboarding";
}

export type PostAuthRouteResult =
  | { ok: true; path: PostAuthPath; me: MeForRouting }
  | { ok: false; kind: "network_error" | "fetch_error" };

export async function resolvePostAuthRoute(): Promise<PostAuthRouteResult> {
  try {
    const me = await ensureMeProfile();
    return { ok: true, path: resolvePostAuthPath(me), me };
  } catch (err) {
    return { ok: false, kind: isNetworkError(err) ? "network_error" : "fetch_error" };
  }
}

/**
 * Where a sign-in Accounts just finished goes: the route's page; with the API not answering, the
 * page that waits for it and then opens the dashboard (the person is signed in, so signing in
 * again would change nothing); none when the API answered with an error.
 */
export function pathAfterSignIn(route: PostAuthRouteResult): string | null {
  if (route.ok) return route.path;
  return route.kind === "network_error" ? "/server-unreachable" : null;
}
