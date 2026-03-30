import {
  clearMeProfileCache,
  ensureMeProfile,
} from "@/lib/me-profile-store";

export interface MeSubscription {
  active: boolean;
  plan: string | null;
  end_date: string | null;
}

export interface MeForRouting {
  /** User public_id from auth/me/; used for cache key when JWT omits user_public_id. */
  public_id?: string;
  active_store_public_id: string | null;
  subscription: MeSubscription;
  stores?: Array<{ public_id?: string }>;
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

export type PostAuthPath = "/" | "/onboarding" | "/plan-not-active";

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
