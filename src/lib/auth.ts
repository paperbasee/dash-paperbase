import { apiClient } from "@/lib/api-client";
import { clearMeProfileCache } from "@/lib/me-profile-store";
import { clearAllUnsentCopies } from "@/lib/theme-editor/unsent-copy";
import {
  setAuthSessionCookie,
  clearAuthSessionCookie,
} from "@/lib/auth-session-cookie";
import {
  createPasskey,
  getPasskeyAssertion,
} from "@/lib/passkeys";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const LAST_ROTATED_AT_KEY = "paperbase_token_rotated_at";

export interface AuthTokens {
  access: string;
  refresh: string;
  active_store_public_id: string | null;
}

export interface SignupResponse {
  detail: string;
  email_verification_required: true;
}

export interface PasskeyInfo {
  public_id: string;
  name: string;
  synced: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface WebAuthnRegisterBegin {
  challenge_id: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}
interface WebAuthnLoginBegin {
  challenge_id: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}

export type MagicLinkPurpose = "login" | "recovery";

export type MagicLinkVerifyResult =
  | { action: "enroll_passkey"; enrollment_ticket: string; email: string }
  | ({ action: "signed_in" } & AuthTokens);

/**
 * Persist a fresh access/refresh pair and mark the session active. Used by every
 * flow that mints tokens (passkey login, magic-link, invite enrollment).
 */
export function storeAuthTokens(access: string, refresh: string): void {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  setAuthSessionCookie();
}

// ---------------------------------------------------------------------------
// Signup (passwordless) — create the account, backend emails a magic link.
// ---------------------------------------------------------------------------

export async function signup(
  email: string,
  first_name: string,
  last_name: string,
  cf_turnstile_response?: string
): Promise<SignupResponse> {
  return apiClient.post<SignupResponse>(`${BASE_URL}/auth/register/`, {
    email: email.trim().toLowerCase(),
    first_name,
    last_name,
    ...(cf_turnstile_response ? { cf_turnstile_response } : {}),
  });
}

// ---------------------------------------------------------------------------
// Passkey login
// ---------------------------------------------------------------------------

/**
 * Full passkey sign-in ceremony. With no email the browser offers a
 * discoverable-credential picker; with an email it scopes to that account.
 */
export async function passkeyLogin(email?: string): Promise<AuthTokens> {
  const begin = await apiClient.post<WebAuthnLoginBegin>(
    `${BASE_URL}/auth/webauthn/login/begin/`,
    email ? { email: email.trim().toLowerCase() } : {}
  );
  const assertion = await getPasskeyAssertion(begin.options);
  const tokens = await apiClient.post<AuthTokens>(
    `${BASE_URL}/auth/webauthn/login/finish/`,
    { challenge_id: begin.challenge_id, response: assertion }
  );
  storeAuthTokens(tokens.access, tokens.refresh);
  return tokens;
}

// ---------------------------------------------------------------------------
// Passkey enrollment (signup / recovery / invite bootstrap, or "add a passkey")
// ---------------------------------------------------------------------------

function defaultPasskeyName(): string {
  if (typeof navigator === "undefined") return "Passkey";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone / iPad";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows device";
  if (/Android/.test(ua)) return "Android device";
  return "Passkey";
}

/**
 * Create a passkey. When `enrollmentTicket` is supplied (bootstrap flows) the
 * finish call returns tokens and logs the user in. When authenticated ("add a
 * passkey" in Settings) it just returns the new credential.
 */
export async function enrollPasskey(opts: {
  enrollmentTicket?: string;
  name?: string;
}): Promise<{ tokens?: AuthTokens; credential: PasskeyInfo }> {
  const authToken = opts.enrollmentTicket ? null : getAccessToken();
  const beginBody = opts.enrollmentTicket
    ? { enrollment_ticket: opts.enrollmentTicket }
    : {};
  const begin = await apiClient.post<WebAuthnRegisterBegin>(
    `${BASE_URL}/auth/webauthn/register/begin/`,
    beginBody,
    authToken
  );
  const attestation = await createPasskey(begin.options);
  const finish = await apiClient.post<
    { credential: PasskeyInfo } & Partial<AuthTokens>
  >(
    `${BASE_URL}/auth/webauthn/register/finish/`,
    {
      challenge_id: begin.challenge_id,
      response: attestation,
      name: opts.name?.trim() || defaultPasskeyName(),
      ...(opts.enrollmentTicket
        ? { enrollment_ticket: opts.enrollmentTicket }
        : {}),
    },
    authToken
  );
  if (finish.access && finish.refresh) {
    storeAuthTokens(finish.access, finish.refresh);
    return {
      tokens: {
        access: finish.access,
        refresh: finish.refresh,
        active_store_public_id: finish.active_store_public_id ?? null,
      },
      credential: finish.credential,
    };
  }
  return { credential: finish.credential };
}

// ---------------------------------------------------------------------------
// Email magic-link (login fallback + device-loss recovery)
// ---------------------------------------------------------------------------

export async function requestMagicLink(
  email: string,
  purpose: MagicLinkPurpose
): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>(`${BASE_URL}/auth/magic/request/`, {
    email: email.trim().toLowerCase(),
    purpose,
  });
}

/**
 * The six-digit code from the same email as the link (API 1.87.0): typed with the address it went
 * to, it does exactly what the link does -- for an owner who opened the email on their phone.
 */
export async function verifyMagicCode(email: string, code: string): Promise<MagicLinkVerifyResult> {
  const result = await apiClient.post<MagicLinkVerifyResult>(`${BASE_URL}/auth/magic/verify-code/`, {
    email: email.trim().toLowerCase(),
    code,
  });
  if (result.action === "signed_in") {
    storeAuthTokens(result.access, result.refresh);
  }
  return result;
}

export async function verifyMagicLink(
  token: string
): Promise<MagicLinkVerifyResult> {
  const result = await apiClient.post<MagicLinkVerifyResult>(
    `${BASE_URL}/auth/magic/verify/`,
    { token }
  );
  if (result.action === "signed_in") {
    storeAuthTokens(result.access, result.refresh);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Passkey management (authenticated)
// ---------------------------------------------------------------------------

export async function listPasskeys(): Promise<PasskeyInfo[]> {
  return apiClient.get<PasskeyInfo[]>(
    `${BASE_URL}/auth/webauthn/credentials/`,
    getAccessToken()
  );
}

export async function renamePasskey(
  publicId: string,
  name: string
): Promise<PasskeyInfo> {
  return apiClient.patch<PasskeyInfo>(
    `${BASE_URL}/auth/webauthn/credentials/${publicId}/`,
    { name },
    getAccessToken()
  );
}

export async function deletePasskey(publicId: string): Promise<void> {
  await apiClient.delete<void>(
    `${BASE_URL}/auth/webauthn/credentials/${publicId}/`,
    getAccessToken()
  );
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** What this browser keeps of the account signed in, other than its tokens: data, profile, edits. */
function forgetSignedInData() {
  if (typeof window !== "undefined") {
    void (async () => {
      const { queryClient } = await import("@/components/QueryProvider");
      const { idbPersister } = await import("@/lib/queryPersister");
      queryClient.clear();
      await idbPersister.removeClient();
    })();
  }
  clearMeProfileCache();
  // Theme edits kept on this device belong to the member signing out.
  clearAllUnsentCopies(localStorage);
}

/** Everything this browser holds for the account signed in: its data, profile, edits and tokens. */
function forgetThisSignIn() {
  forgetSignedInData();
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem(LAST_ROTATED_AT_KEY);
  clearAuthSessionCookie();
}

/**
 * Who a token signs in, and which sign-in -- its user and its session (`sid`) -- so a tab can
 * tell another tab's new sign-in from the hourly renewal of the same one. Null if unreadable.
 */
export function signInOf(token: string | null): { user: string; sid: string } | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      user_public_id?: unknown;
      sid?: unknown;
    };
    return { user: String(payload.user_public_id ?? ""), sid: typeof payload.sid === "string" ? payload.sid : "" };
  } catch {
    return null;
  }
}

/** Leave for the sign-in page, forgetting this browser's sign-in -- the API is not told (see signOut). */
export function logout() {
  window.location.replace("/login");
  forgetThisSignIn();
}

/**
 * The person pressed Sign out: the API ends this browser's sign-in, so it leaves the owner's
 * Sessions list at once, then the browser forgets it.
 *
 * Only for that press. The automatic sign-outs -- another tab signed out, a sign-in that ran
 * out -- use `logout` alone: they react to tokens already changed, and the token in storage by
 * then may be a new sign-in's (a support visit just entered in another tab), which they must not
 * end (2026-09-29).
 */
export function signOut() {
  const access = localStorage.getItem("access_token");
  if (access) {
    void fetch(`${BASE_URL}/auth/logout/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      keepalive: true,
    }).catch(() => undefined);
  }
  logout();
}

// ---------------------------------------------------------------------------
// Paperbase support inside a shop's dashboard ("Sign in as this shop" in Django admin).
// ---------------------------------------------------------------------------

export type SupportSessionInfo = { public_id: string; store_name: string; expires_at: string };

/**
 * The admin's one-time ticket for a support session's tokens (POST auth/support/enter/). Whatever
 * this browser held for another sign-in goes first, as a sign-out would clear it.
 */
export async function enterSupportSession(ticket: string): Promise<SupportSessionInfo> {
  const result = await apiClient.post<AuthTokens & { support_session: SupportSessionInfo }>(
    `${BASE_URL}/auth/support/enter/`,
    { ticket }
  );
  // Replaced in one step, never emptied first: another tab that saw no sign-in for a moment would
  // sign itself out and take the new one with it.
  forgetSignedInData();
  storeAuthTokens(result.access, result.refresh);
  return result.support_session;
}

/** A support session ended: sign out, onto a page that says so rather than the sign-in page. */
export function leaveSupportSession() {
  window.location.replace("/auth/support?ended=1");
  forgetThisSignIn();
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
