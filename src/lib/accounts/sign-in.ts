/**
 * Signing in at Accounts, the standard's way (OpenID Connect's authorization code with PKCE,
 * guidelines/accounts-plan.md, section 7): the dashboard sends the browser to Accounts'
 * `/authorize`, Accounts signs the person in (or sees they already are) and sends them back to
 * `/auth/callback` with a one-time code, and this page trades the code at `/token` for the entry
 * pass. Only this tab can trade it: it alone holds the PKCE verifier, kept in this tab's session
 * storage for the trip.
 *
 * Sign-up is the same trip with `prompt=create`; a support visit starts it at Accounts'
 * `/support/start` with the admin's ticket.
 */

import { CLIENT_ID, SCOPES, accountsUrl, callbackUrl } from "./config";

/** The trip in progress, in this tab only. */
export const PENDING_KEY = "paperbase_sign_in_pending";
/** A trip older than this is not finished: the code would have run out anyway. */
const PENDING_MAX_AGE_MS = 30 * 60 * 1000;

interface Pending {
  state: string;
  verifier: string;
  nonce: string;
  /** Where in the dashboard to go after: a safe, locale-free path, or "". */
  next: string;
  startedAt: number;
}

export interface SignInRequest {
  /** Where to go after signing in (already checked by getSafeNextPath). */
  next?: string | null;
  /** Why the last sign-in ended, for Accounts' sign-in page to say (lib/sign-in-ended). */
  ended?: string | null;
  /** `create`: Accounts' sign-up instead of its sign-in. */
  prompt?: "create";
  /** The dashboard's language, for Accounts' pages. */
  locale?: string;
}

function base64Url(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A random value for state, nonce and the verifier: 32 bytes, base64url. */
export function randomValue(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** PKCE's S256 challenge for a verifier (RFC 7636). */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/**
 * The address of Accounts' `/authorize` for this trip, with the trip kept for its return. Extra
 * parameters Accounts' pages read from it: `ended` (why the last sign-in ended) and `ui_locales`.
 */
export async function authorizeUrl(request: SignInRequest = {}): Promise<string> {
  const pending: Pending = {
    state: randomValue(),
    verifier: randomValue(),
    nonce: randomValue(),
    next: request.next ?? "",
    startedAt: Date.now(),
  };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: callbackUrl(),
    scope: SCOPES,
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: await challengeFor(pending.verifier),
    code_challenge_method: "S256",
  });
  if (request.prompt) params.set("prompt", request.prompt);
  if (request.ended) params.set("ended", request.ended);
  if (request.locale) params.set("ui_locales", request.locale);
  return `${accountsUrl()}/authorize?${params.toString()}`;
}

/**
 * Where a support visit starts: Accounts spends the admin's ticket, starts the support sign-in,
 * then goes on to the same `/authorize` trip (accounts-paperbase signin/views.support_start).
 */
export async function supportVisitUrl(ticket: string, locale?: string): Promise<string> {
  const authorize = new URL(await authorizeUrl({ locale }));
  const params = new URLSearchParams({ ticket, next: `${authorize.pathname}${authorize.search}` });
  return `${accountsUrl()}/support/start?${params.toString()}`;
}

/** Why a return from Accounts did not sign anyone in. */
export type SignInFailure =
  /** No trip of this tab's, a stale one, or a state that does not match: start again. */
  | "lost"
  /** Accounts said no (a code used or run out, `login_required`, ...): start again. */
  | "refused"
  /** Accounts could not be reached. */
  | "unreachable";

export type SignInResult = { ok: true; pass: string; next: string } | { ok: false; failure: SignInFailure };

function takePending(): Pending | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw) as Pending;
    if (Date.now() - pending.startedAt > PENDING_MAX_AGE_MS) return null;
    return pending;
  } catch {
    return null;
  }
}

/** The ID token's claims, read (not checked): it came straight from Accounts over TLS. */
function idTokenClaims(idToken: unknown): Record<string, unknown> | null {
  if (typeof idToken !== "string") return null;
  try {
    const part = idToken.split(".")[1] ?? "";
    const padded = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * The ID token is for this trip: Accounts', for the dashboard, with this trip's nonce. Its
 * signature is not checked: it came straight from Accounts' `/token` over TLS (OpenID Connect
 * Core 3.1.3.7), and the API checks the pass's stamp itself.
 */
export function idTokenFits(idToken: unknown, nonce: string, issuer: string = accountsUrl()): boolean {
  const claims = idTokenClaims(idToken);
  if (!claims) return false;
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return claims.iss === issuer && audience.includes(CLIENT_ID) && claims.nonce === nonce;
}

/** Back from Accounts (`/auth/callback?code=...&state=...`): the code traded for the pass. */
export async function finishSignIn(query: URLSearchParams): Promise<SignInResult> {
  const pending = takePending();
  if (!pending || query.get("state") !== pending.state) return { ok: false, failure: "lost" };
  const code = query.get("code");
  if (!code || query.get("error")) return { ok: false, failure: "refused" };

  let answer: Response;
  try {
    answer = await fetch(`${accountsUrl()}/token`, {
      method: "POST",
      // A plain form: no preflight, and Accounts lets this origin read every answer.
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl(),
        client_id: CLIENT_ID,
        code_verifier: pending.verifier,
      }),
    });
  } catch {
    return { ok: false, failure: "unreachable" };
  }
  if (answer.status >= 500) return { ok: false, failure: "unreachable" };
  const body = (await answer.json().catch(() => null)) as { access_token?: unknown; id_token?: unknown } | null;
  if (!answer.ok || typeof body?.access_token !== "string" || !idTokenFits(body.id_token, pending.nonce)) {
    return { ok: false, failure: "refused" };
  }
  return { ok: true, pass: body.access_token, next: pending.next };
}
