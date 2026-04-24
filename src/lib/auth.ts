import axios from "axios";
import { clearMeProfileCache } from "@/lib/me-profile-store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

/**
 * Set a lightweight routing cookie for the Next.js edge middleware.
 * This is NOT the JWT itself — it is only a hint that a session exists.
 * The Django backend independently verifies the JWT on every API call.
 */
function setAuthSessionCookie() {
  document.cookie = "auth_session=1; path=/; SameSite=Strict";
}

function clearAuthSessionCookie() {
  document.cookie = "auth_session=; path=/; max-age=0; SameSite=Strict";
}

export async function register(
  email: string,
  password: string,
  password_confirm: string,
  cf_turnstile_response?: string
): Promise<RegisterResponse | PendingTwoFactorResponse> {
  const { data } = await axios.post<RegisterResponse | PendingTwoFactorResponse>(
    `${BASE_URL}/auth/register/`,
    {
      email: email.trim().toLowerCase(),
      password,
      password_confirm,
      ...(cf_turnstile_response ? { cf_turnstile_response } : {}),
    }
  );
  return data;
}

export async function login(
  email: string,
  password: string,
  cf_turnstile_response?: string
): Promise<LoginResult> {
  const { data } = await axios.post<LoginResult>(`${BASE_URL}/auth/token/`, {
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
  const { data } = await axios.post<LoginResponse>(
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
  const { data } = await axios.post<{ detail: string; sent: boolean }>(
    `${BASE_URL}/auth/2fa/challenge/recovery/request/`,
    {
      challenge_public_id: challengeId,
      email: email.trim().toLowerCase(),
    }
  );
  return data;
}

export async function verifyTwoFactorChallengeRecovery(
  challengeId: string,
  code: string
): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(
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
  clearMeProfileCache();
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  clearAuthSessionCookie();
  window.location.href = "/login";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
