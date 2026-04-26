import axios from "axios";
import { isVerifyEmailRoute } from "@/lib/verification-state";
import {
  setAuthSessionCookie,
  clearAuthSessionCookie,
} from "@/lib/auth-session-cookie";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

type RefreshResponse = {
  access?: unknown;
  refresh?: unknown;
};

type JwtPayload = {
  exp?: unknown;
  active_store_public_id?: unknown;
};

const REFRESH_TIMEOUT_MS = 15_000;
const PROACTIVE_REFRESH_LEEWAY_MS = 10_000;
const RECENT_ROTATION_WINDOW_MS = 30_000;
const LAST_ROTATED_AT_KEY = "paperbase_token_rotated_at";
const ME_PROFILE_STORAGE_KEY = "paperbase_me_profile_v6";
const REFRESH_LOCK_NAME = "paperbase-token-refresh";

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let refreshBlocked = false;

function clearAuthStateAndRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem(LAST_ROTATED_AT_KEY);
  localStorage.removeItem(ME_PROFILE_STORAGE_KEY);
  clearAuthSessionCookie();
  delete api.defaults.headers.common.Authorization;
  delete api.defaults.headers.common["X-Store-Public-ID"];
  delete axios.defaults.headers.common.Authorization;
  delete axios.defaults.headers.common["X-Store-Public-ID"];
  refreshBlocked = true;
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

  localStorage.setItem(LAST_ROTATED_AT_KEY, String(Date.now()));
  setAuthSessionCookie();
  refreshBlocked = false;
  return data.access;
}

function readLastRotatedAt(): number | null {
  const raw = localStorage.getItem(LAST_ROTATED_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getActiveStorePublicIdFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const val = payload.active_store_public_id;
  if (typeof val === "string" && val.trim()) return val;
  return null;
}

function isExpiringSoon(token: string, leewayMs: number): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  // exp is seconds since epoch.
  const expMs = payload.exp * 1000;
  return Date.now() + leewayMs >= expMs;
}

function hasUsableRefreshToken(): boolean {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return false;
  const payload = decodeJwtPayload(refreshToken);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 > Date.now();
}

function hasAccessToken(): boolean {
  const accessToken = localStorage.getItem("access_token");
  return typeof accessToken === "string" && accessToken.length > 0;
}

async function performRefreshUnderLock(): Promise<string> {
  // By the time we hold the lock, another tab may have already rotated.
  // Honor that fresh access token to avoid re-using a (possibly already
  // blacklisted) refresh token.
  const justRotatedAt = readLastRotatedAt();
  if (
    justRotatedAt !== null &&
    Date.now() - justRotatedAt < RECENT_ROTATION_WINDOW_MS
  ) {
    const fresh = localStorage.getItem("access_token");
    if (fresh && !isExpiringSoon(fresh, PROACTIVE_REFRESH_LEEWAY_MS)) {
      return fresh;
    }
  }

  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken || !hasUsableRefreshToken()) {
    clearAuthStateAndRedirect();
    throw new Error("Missing or expired refresh token");
  }

  const requestRefresh = async (token: string): Promise<string> => {
    const { data } = await axios.post<RefreshResponse>(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/token/refresh/`,
      { refresh: token },
      { timeout: REFRESH_TIMEOUT_MS }
    );
    return persistTokens(data);
  };

  try {
    return await requestRefresh(refreshToken);
  } catch (err) {
    // Only nuke the session when the refresh token itself was rejected.
    // Network errors, timeouts, and 5xx must leave the session intact so
    // the user can retry without being kicked to /login.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 401 || status === 403) {
      const latestRefreshToken = localStorage.getItem("refresh_token");
      if (
        latestRefreshToken &&
        latestRefreshToken !== refreshToken &&
        hasUsableRefreshToken()
      ) {
        try {
          return await requestRefresh(latestRefreshToken);
        } catch (retryErr) {
          const retryStatus = axios.isAxiosError(retryErr)
            ? retryErr.response?.status
            : undefined;
          if (retryStatus === 401 || retryStatus === 403) {
            clearAuthStateAndRedirect();
          }
          throw retryErr;
        }
      }
      clearAuthStateAndRedirect();
    }
    throw err;
  }
}

async function refreshAccessTokenSingleFlight(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Cross-tab single-flight via the Web Locks API. Only one tab in the
      // whole browser will run the refresh request at a time; other tabs
      // wait, then re-check `LAST_ROTATED_AT_KEY` and skip the network call
      // if a sibling tab just rotated.
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.locks !== "undefined" &&
        typeof navigator.locks.request === "function"
      ) {
        return await navigator.locks.request(REFRESH_LOCK_NAME, () =>
          performRefreshUnderLock()
        );
      }
      // Fallback for browsers without Web Locks: keep best-effort per-tab
      // single-flight (handled by the outer isRefreshing guard).
      return await performRefreshUnderLock();
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

api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    let token = localStorage.getItem("access_token");
    if (token && hasUsableRefreshToken()) {
      // A successful new login/session should allow refresh flow again.
      refreshBlocked = false;
    }

    // Proactive refresh: if the access token is about to expire, renew it
    // before sending the request so the user never sees a 401 round-trip.
    // Skip for the refresh endpoint itself to avoid recursion.
    const isRefreshCall = String(config.url || "").includes(
      "/auth/token/refresh/"
    );
    if (
      token &&
      !isRefreshCall &&
      !refreshBlocked &&
      hasUsableRefreshToken() &&
      isExpiringSoon(token, PROACTIVE_REFRESH_LEEWAY_MS)
    ) {
      try {
        token = await refreshAccessTokenSingleFlight();
      } catch {
        // Fall through with the (possibly-stale) token; the response
        // interceptor will handle a 401 and retry.
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Backend tenant context is resolved in middleware (before DRF auth attaches request.auth),
      // so we must also send the active store hint as a header for tenant-scoped admin APIs.
      const activeStorePublicId = getActiveStorePublicIdFromJwt(token);
      if (activeStorePublicId) {
        config.headers["X-Store-Public-ID"] = activeStorePublicId;
      }
    } else {
      delete config.headers.Authorization;
      delete config.headers["X-Store-Public-ID"];
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
      !String(originalRequest?.url || "").includes("/auth/token/refresh/") &&
      !refreshBlocked &&
      hasAccessToken() &&
      hasUsableRefreshToken()
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
