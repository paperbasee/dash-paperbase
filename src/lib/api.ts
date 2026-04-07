import axios from "axios";
import { isVerifyEmailRoute } from "@/lib/verification-state";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

type RefreshResponse = {
  access?: unknown;
  refresh?: unknown;
};

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

function setAuthSessionCookie() {
  document.cookie = "auth_session=1; path=/; SameSite=Strict";
}

function clearAuthSessionCookie() {
  document.cookie = "auth_session=; path=/; max-age=0; SameSite=Strict";
}

function clearAuthStateAndRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  clearAuthSessionCookie();
  window.location.href = "/login";
}

function persistTokens(data: RefreshResponse): string {
  if (typeof data.access !== "string" || data.access.length === 0) {
    throw new Error("Invalid refresh response: missing access token");
  }

  localStorage.setItem("access_token", data.access);

  if (typeof data.refresh === "string" && data.refresh.length > 0) {
    localStorage.setItem("refresh_token", data.refresh);
  }

  setAuthSessionCookie();
  return data.access;
}

async function refreshAccessTokenSingleFlight(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    clearAuthStateAndRedirect();
    throw new Error("Missing refresh token");
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { data } = await axios.post<RefreshResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/token/refresh/`,
        { refresh: refreshToken }
      );
      return persistTokens(data);
    } catch (err) {
      clearAuthStateAndRedirect();
      throw err;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Refreshes access (and refresh when rotation is enabled) from the stored refresh token. */
export async function refreshAccessTokenOrThrow(): Promise<string> {
  return refreshAccessTokenSingleFlight();
}

export function getActiveStorePublicIdFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = atob(padded);
    const data = JSON.parse(json) as { active_store_public_id?: unknown };
    const val = data.active_store_public_id;
    if (typeof val === "string" && val.trim()) return val;
    return null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  // Let browser set Content-Type with boundary when sending FormData
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const skipVerifyEmailRedirect =
      typeof window !== "undefined" && isVerifyEmailRoute(window.location.pathname);

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !String(originalRequest?.url || "").includes("/auth/token/refresh/")
    ) {
      if (skipVerifyEmailRedirect) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;

      try {
        const access = await refreshAccessTokenSingleFlight();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
