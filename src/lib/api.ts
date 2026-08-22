import { isVerifyEmailRoute } from "@/lib/verification-state";
import {
  setAuthSessionCookie,
  clearAuthSessionCookie,
} from "@/lib/auth-session-cookie";
import {
  ApiHttpError,
  ApiTransportError,
  buildApiUrl,
  isApiHttpError,
} from "@/lib/api-client";
import { recordApiLatency } from "@/lib/api-latency";

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
const ME_PROFILE_STORAGE_KEY = "paperbase_me_profile_v7";
const REFRESH_LOCK_NAME = "paperbase-token-refresh";

const RETRY_AFTER_401 = Symbol("paperbaseApiRetry401");

type AxiosCompatConfig = {
  params?: object;
  headers?: Record<string, string | undefined> | Headers;
  responseType?: "json" | "blob" | "text";
  signal?: AbortSignal;
  timeout?: number;
  [RETRY_AFTER_401]?: boolean;
};

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let refreshBlocked = false;

function extractDetailMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0 && typeof detail[0] === "string") {
    return detail[0];
  }
  return null;
}

function mergeAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const present = signals.filter((s): s is AbortSignal => s != null);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any(present);
  }
  const ctrl = new AbortController();
  for (const s of present) {
    if (s.aborted) {
      ctrl.abort(s.reason);
      return ctrl.signal;
    }
    s.addEventListener("abort", () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}

function clearAuthStateAndRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem(LAST_ROTATED_AT_KEY);
  localStorage.removeItem(ME_PROFILE_STORAGE_KEY);
  clearAuthSessionCookie();
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
    const url = buildApiUrl("auth/token/refresh/");
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: token }),
        signal: controller.signal,
      });
    } catch (cause) {
      throw new ApiTransportError(
        cause instanceof Error ? cause.message : "Network request failed",
        { cause: cause instanceof Error ? cause : undefined }
      );
    } finally {
      clearTimeout(tid);
    }

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const msg = extractDetailMessage(parsed) ?? `HTTP ${res.status}`;
      throw new ApiHttpError(msg, res.status, parsed);
    }

    return persistTokens(parsed as RefreshResponse);
  };

  try {
    return await requestRefresh(refreshToken);
  } catch (err) {
    const status = isApiHttpError(err) ? err.status : undefined;
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
          const retryStatus = isApiHttpError(retryErr) ? retryErr.status : undefined;
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
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.locks !== "undefined" &&
        typeof navigator.locks.request === "function"
      ) {
        return await navigator.locks.request(REFRESH_LOCK_NAME, () =>
          performRefreshUnderLock()
        );
      }
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

function normalizeConfigHeaders(
  headers: AxiosCompatConfig["headers"],
  body: unknown
): Headers {
  const h = new Headers();
  if (headers) {
    if (headers instanceof Headers) {
      headers.forEach((v, k) => h.set(k, v));
    } else {
      for (const [k, v] of Object.entries(headers)) {
        if (v !== undefined) h.set(k, v);
      }
    }
  }
  if (!(body instanceof FormData) && !h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }
  if (body instanceof FormData) {
    h.delete("Content-Type");
  }
  return h;
}

async function prepareAuthHeaders(requestPath: string): Promise<Headers> {
  const h = new Headers();
  if (typeof window === "undefined") {
    return h;
  }

  let token = localStorage.getItem("access_token");
  if (token && hasUsableRefreshToken()) {
    refreshBlocked = false;
  }

  const isRefreshCall = requestPath.includes("/auth/token/refresh/");
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
      // keep possibly-stale token; caller may get 401 and retry via executeRequest
    }
  }

  if (token) {
    h.set("Authorization", `Bearer ${token}`);
    const activeStorePublicId = getActiveStorePublicIdFromJwt(token);
    if (activeStorePublicId) {
      h.set("X-Store-Public-ID", activeStorePublicId);
    }
  }

  return h;
}

async function executeRequest<T>(
  method: string,
  path: string,
  body: unknown,
  config: AxiosCompatConfig
): Promise<{ data: T; status: number; statusText: string; headers: Headers }> {
  const isRefreshCall = path.includes("/auth/token/refresh/");
  const isRetry401 = config[RETRY_AFTER_401] === true;

  const url = buildApiUrl(path, config.params);
  const timeoutMs = config.timeout;
  let timeoutClear: (() => void) | undefined;
  const timeoutSignal =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(timeoutMs)
        : (() => {
            const c = new AbortController();
            const tid = setTimeout(() => {
              c.abort(new DOMException("The operation timed out.", "TimeoutError"));
            }, timeoutMs);
            timeoutClear = () => clearTimeout(tid);
            return c.signal;
          })()
      : undefined;

  const mergedSignal = mergeAbortSignals(config.signal, timeoutSignal);

  const authHeaders = await prepareAuthHeaders(path);
  const extraHeaders = normalizeConfigHeaders(config.headers, body);
  extraHeaders.forEach((v, k) => authHeaders.set(k, v));

  let reqBody: BodyInit | undefined;
  if (body === undefined || body === null) {
    reqBody = undefined;
  } else if (body instanceof FormData) {
    reqBody = body;
  } else if (typeof body === "string") {
    reqBody = body;
  } else {
    reqBody = JSON.stringify(body);
  }

  let res: Response;
  const requestStartedAt = performance.now();
  try {
    res = await fetch(url, {
      method,
      headers: authHeaders,
      body: reqBody,
      signal: mergedSignal,
    });
    recordApiLatency(performance.now() - requestStartedAt);
  } catch (cause) {
    throw new ApiTransportError(
      cause instanceof Error ? cause.message : "Network request failed",
      { cause: cause instanceof Error ? cause : undefined }
    );
  } finally {
    timeoutClear?.();
  }

  const skipVerifyEmailRedirect =
    typeof window !== "undefined" && isVerifyEmailRoute(window.location.pathname);

  if (
    res.status === 401 &&
    !isRetry401 &&
    !isRefreshCall &&
    !refreshBlocked &&
    hasAccessToken() &&
    hasUsableRefreshToken()
  ) {
    const text401 = await res.text();
    let data401: unknown = null;
    try {
      data401 = text401 ? JSON.parse(text401) : null;
    } catch {
      data401 = text401;
    }
    const msg401 = extractDetailMessage(data401) ?? `HTTP ${res.status}`;

    if (skipVerifyEmailRedirect) {
      throw new ApiHttpError(msg401, res.status, data401);
    }

    try {
      await refreshAccessTokenSingleFlight();
      const retryConfig: AxiosCompatConfig = { ...config, [RETRY_AFTER_401]: true };
      return executeRequest<T>(method, path, body, retryConfig);
    } catch {
      throw new ApiHttpError(msg401, res.status, data401);
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    let parsed: unknown = null;
    if (errText) {
      try {
        parsed = JSON.parse(errText) as unknown;
      } catch {
        parsed = errText;
      }
    }
    const msg = extractDetailMessage(parsed) ?? `HTTP ${res.status}`;
    throw new ApiHttpError(msg, res.status, parsed);
  }

  const responseType = config.responseType ?? "json";

  if (responseType === "blob") {
    const blob = await res.blob();
    return {
      data: blob as T,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    };
  }

  if (responseType === "text") {
    const textBody = await res.text();
    return {
      data: textBody as T,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    };
  }

  const okText = await res.text();
  if (!okText) {
    return {
      data: undefined as T,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    };
  }

  try {
    const data = JSON.parse(okText) as T;
    return {
      data,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    };
  } catch {
    return {
      data: okText as unknown as T,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    };
  }
}

const api = {
  get<T = any>(path: string, config?: AxiosCompatConfig) {
    return executeRequest<T>("GET", path, undefined, config ?? {});
  },

  delete<T = any>(path: string, config?: AxiosCompatConfig) {
    return executeRequest<T>("DELETE", path, undefined, config ?? {});
  },

  post<T = any>(path: string, data?: unknown, config?: AxiosCompatConfig) {
    return executeRequest<T>("POST", path, data, config ?? {});
  },

  put<T = any>(path: string, data?: unknown, config?: AxiosCompatConfig) {
    return executeRequest<T>("PUT", path, data, config ?? {});
  },

  patch<T = any>(path: string, data?: unknown, config?: AxiosCompatConfig) {
    return executeRequest<T>("PATCH", path, data, config ?? {});
  },
};

export default api;
