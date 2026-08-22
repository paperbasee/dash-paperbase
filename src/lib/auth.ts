import { apiClient } from "@/lib/api-client";
import { clearMeProfileCache } from "@/lib/me-profile-store";
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

export function logout() {
  if (typeof window !== "undefined") {
    void (async () => {
      const { queryClient } = await import("@/components/QueryProvider");
      const { idbPersister } = await import("@/lib/queryPersister");
      queryClient.clear();
      await idbPersister.removeClient();
    })();
  }
  window.location.replace("/login");
  clearMeProfileCache();
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem(LAST_ROTATED_AT_KEY);
  clearAuthSessionCookie();
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
