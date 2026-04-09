import {
  clearMeProfileCache,
  ensureMeProfile,
} from "@/lib/me-profile-store";

export interface MeSubscription {
  active: boolean;
  plan: string | null;
  end_date: string | null;
  days_remaining: number;
  is_expiring_soon: boolean;
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

/** Clear cached auth/me (logout, store deletion, etc.). */
export function invalidateMeRoutingCache(): void {
  clearMeProfileCache();
}

/** Loads profile via ensureMeProfile (session + deduped network). */
export async function fetchMeForRouting(): Promise<MeForRouting> {
  return ensureMeProfile();
}

export function hasActiveSubscription(me: MeForRouting): boolean {
  return me.subscription?.active === true;
}

export type PostAuthPath = "/" | "/onboarding" | "/plan-not-active" | "/recover";

/**
 * Where to send the user after login / 2FA, using server truth from auth/me/.
 */
export function resolvePostAuthPath(me: MeForRouting): PostAuthPath {
  if (!hasActiveSubscription(me)) {
    return "/plan-not-active";
  }
  if (me.active_store_public_id) {
    return "/";
  }
  if (me.has_recoverable_stores === true) {
    return "/recover";
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
