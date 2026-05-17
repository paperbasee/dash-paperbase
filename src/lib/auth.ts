import { apiClient } from "@/lib/api-client";
import { clearMeProfileCache } from "@/lib/me-profile-store";
import {
  setAuthSessionCookie,
  clearAuthSessionCookie,
} from "@/lib/auth-session-cookie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const LAST_ROTATED_AT_KEY = "paperbase_token_rotated_at";

export interface LoginResponse {
  access: string;
  refresh: string;
  active_store_public_id: string | null;
}

export interface PendingTwoFactorResponse {
  ["2fa_required"]: true;
  challenge_public_id: string;
  flow: "login" | "register";
}

export type LoginResult = LoginResponse | PendingTwoFactorResponse;

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
}

export interface RegisterResponse {
  detail: string;
  email_verification_required: true;
}

export async function register(
  email: string,
  password: string,
  password_confirm: string,
  cf_turnstile_response?: string
): Promise<RegisterResponse | PendingTwoFactorResponse> {
  return apiClient.post<RegisterResponse | PendingTwoFactorResponse>(
    `${BASE_URL}/auth/register/`,
    {
      email: email.trim().toLowerCase(),
      password,
      password_confirm,
      ...(cf_turnstile_response ? { cf_turnstile_response } : {}),
    }
  );
}

export async function login(
  email: string,
  password: string,
  cf_turnstile_response?: string
): Promise<LoginResult> {
  const data = await apiClient.post<LoginResult>(`${BASE_URL}/auth/token/`, {
    email: email.trim().toLowerCase(),
    password,
    ...(cf_turnstile_response ? { cf_turnstile_response } : {}),
  });
  if (!("2fa_required" in data)) {
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    setAuthSessionCookie();
  }
  return data;
}

export async function verifyTwoFactorChallenge(
  challengeId: string,
  code: string
): Promise<LoginResponse> {
  const data = await apiClient.post<LoginResponse>(
    `${BASE_URL}/auth/2fa/challenge/verify/`,
    {
      challenge_public_id: challengeId,
      code,
    }
  );
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  setAuthSessionCookie();
  return data;
}

export async function requestTwoFactorChallengeRecoveryCode(
  challengeId: string,
  email: string
): Promise<{ detail: string; sent: boolean }> {
  return apiClient.post<{ detail: string; sent: boolean }>(
    `${BASE_URL}/auth/2fa/challenge/recovery/request/`,
    {
      challenge_public_id: challengeId,
      email: email.trim().toLowerCase(),
    }
  );
}

export async function verifyTwoFactorChallengeRecovery(
  challengeId: string,
  code: string
): Promise<LoginResponse> {
  const data = await apiClient.post<LoginResponse>(
    `${BASE_URL}/auth/2fa/challenge/recovery/verify/`,
    {
      challenge_public_id: challengeId,
      code,
    }
  );
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  setAuthSessionCookie();
  return data;
}

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
