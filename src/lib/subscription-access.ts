import api from "@/lib/api";

export interface MeSubscription {
  active: boolean;
  plan: string | null;
  end_date: string | null;
}

export interface MeForRouting {
  active_store_public_id: string | null;
  subscription: MeSubscription;
  stores?: Array<{ public_id?: string }>;
}

export async function fetchMeForRouting(): Promise<MeForRouting> {
  const { data } = await api.get<MeForRouting>("auth/me/");
  return data;
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
  | { ok: true; path: PostAuthPath }
  | { ok: false; kind: "fetch_error" };

export async function resolvePostAuthRoute(): Promise<PostAuthRouteResult> {
  try {
    const me = await fetchMeForRouting();
    return { ok: true, path: resolvePostAuthPath(me) };
  } catch {
    return { ok: false, kind: "fetch_error" };
  }
}
