/**
 * The entry pass: Accounts' 10-minute stamp that every API request and the live socket carry
 * (guidelines/accounts-plan.md, section 7). The page keeps it in memory only, never in storage,
 * where a bad script could read it. The long-lived part of the sign-in is Accounts' locked cookie,
 * which this page cannot see: a little before the pass runs out, the page asks Accounts for a
 * fresh one, and the browser sends that cookie along by itself (`POST /passes/renew`).
 *
 * One tab, one pass. Every tab of the browser renews its own from the same cookie, so they share
 * the sign-in, and a tab whose renewal comes back for another person or another sign-in (a support
 * visit opened in another tab, say) reloads to follow it.
 */

import { hasAuthSessionCookie, setAuthSessionCookie } from "@/lib/auth-session-cookie";

import { accountsUrl } from "./config";

/** What a pass says about itself (accounts-paperbase passes/entry_pass.py). */
export interface PassClaims {
  /** The person: `usr_...`. */
  sub: string;
  /** The sign-in: `ses_...`. */
  sid: string;
  /** Seconds since 1970 when it stops working. */
  exp: number;
  /** Paperbase support acting as the person `sub` names, on a visit. */
  support: boolean;
}

/** How a renewal went: a fresh pass, the sign-in is over, or Accounts did not answer. */
export type Renewal = { kind: "renewed"; pass: string } | { kind: "signed_out" } | { kind: "unreachable" };

/** Renew this long before a pass runs out. */
export const RENEW_BEFORE_MS = 60_000;
const RENEW_TIMEOUT_MS = 15_000;

/** The pass's claims, or null for anything that is not one. Read only: the API checks the stamp. */
export function readPass(pass: string | null | undefined): PassClaims | null {
  if (!pass) return null;
  try {
    const part = pass.split(".")[1] ?? "";
    const padded = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as Record<string, unknown>;
    if (typeof claims.sub !== "string" || typeof claims.sid !== "string" || typeof claims.exp !== "number") {
      return null;
    }
    return { sub: claims.sub, sid: claims.sid, exp: claims.exp, support: Boolean(claims.act) };
  } catch {
    return null;
  }
}

/** Whether two passes are the same sign-in of the same person (a renewal), or not. */
export function sameSignIn(a: PassClaims | null, b: PassClaims | null): boolean {
  return Boolean(a && b && a.sub === b.sub && a.sid === b.sid);
}

let current: { pass: string; claims: PassClaims } | null = null;
let renewing: Promise<Renewal> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const signedOutListeners = new Set<() => void>();

/** The pass held now, whether or not it is about to run out; null when none. */
export function heldPass(): string | null {
  return current?.pass ?? null;
}

/** The claims of the pass held now. */
export function heldClaims(): PassClaims | null {
  return current?.claims ?? null;
}

/**
 * Hold a pass: the one from signing in, or a renewal's. A renewal for another person or another
 * sign-in than the one held means this browser signed in again elsewhere: the tab reloads into it.
 */
export function holdPass(pass: string): void {
  const claims = readPass(pass);
  if (!claims) return;
  if (current && !sameSignIn(current.claims, claims)) {
    current = null;
    window.location.reload();
    return;
  }
  current = { pass, claims };
  // The proxy's hint that this browser is signed in, kept as long as Accounts' sign-in.
  setAuthSessionCookie();
  scheduleRenewal(claims);
}

/** Forget the pass (signing out, or the sign-in ended). */
export function dropPass(): void {
  current = null;
  if (timer) clearTimeout(timer);
  timer = null;
}

/** Told when a renewal finds the sign-in over: the tab leaves for the sign-in page. */
export function onSignedOut(listener: () => void): () => void {
  signedOutListeners.add(listener);
  return () => signedOutListeners.delete(listener);
}

function scheduleRenewal(claims: PassClaims): void {
  if (timer) clearTimeout(timer);
  const wait = Math.max(0, claims.exp * 1000 - Date.now() - RENEW_BEFORE_MS);
  timer = setTimeout(() => void renewPass(), wait);
}

/** Whether a pass runs out within `withinMs`. */
export function runsOutSoon(claims: PassClaims, withinMs: number = RENEW_BEFORE_MS, now: number = Date.now()): boolean {
  return claims.exp * 1000 - now <= withinMs;
}

/**
 * A fresh pass from Accounts, one request at a time per tab. `signed_out` tells the listeners
 * (and forgets the pass); `unreachable` keeps whatever pass is held, which may still work.
 */
export function renewPass(): Promise<Renewal> {
  if (renewing) return renewing;
  renewing = (async (): Promise<Renewal> => {
    let answer: Response;
    try {
      answer = await fetch(`${accountsUrl()}/passes/renew`, {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(RENEW_TIMEOUT_MS),
      });
    } catch {
      return { kind: "unreachable" };
    }
    if (answer.status === 401) {
      // Only a tab that held a pass has a sign-in to leave; one that never did just has none.
      const held = current !== null;
      dropPass();
      if (held) for (const listener of signedOutListeners) listener();
      return { kind: "signed_out" };
    }
    if (!answer.ok) return { kind: "unreachable" };
    const body = (await answer.json().catch(() => null)) as { access_token?: unknown } | null;
    if (typeof body?.access_token !== "string") return { kind: "unreachable" };
    holdPass(body.access_token);
    return { kind: "renewed", pass: body.access_token };
  })().finally(() => {
    renewing = null;
  });
  return renewing;
}

/**
 * The pass for a request: the one held, renewed first when it is about to run out, or one from
 * Accounts when the tab holds none yet but the browser is signed in (a page just opened). Null
 * when signed out -- the request goes without one -- or when Accounts is away and none is in date.
 */
export async function passForRequest(): Promise<string | null> {
  if (current && !runsOutSoon(current.claims)) return current.pass;
  if (!current && !hasAuthSessionCookie()) return null;
  const renewal = await renewPass();
  if (renewal.kind === "renewed") return renewal.pass;
  // Accounts away: a pass still in date is still good at the API.
  if (current && current.claims.exp * 1000 > Date.now()) return current.pass;
  return null;
}

/** A tab woken from sleep renews at once if its pass ran out or is about to. */
export function renewIfStale(): void {
  if (current && runsOutSoon(current.claims)) void renewPass();
}
