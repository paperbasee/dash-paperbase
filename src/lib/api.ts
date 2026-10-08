import {
  ApiHttpError,
  ApiTransportError,
  buildApiUrl,
} from "@/lib/api-client";
import { recordApiLatency } from "@/lib/api-latency";
import { heldClaims, passForRequest, renewPass } from "@/lib/accounts/pass";
import { activeShop } from "@/lib/active-shop";

/**
 * The dashboard's API client. Every request carries the pass (lib/accounts/pass, held in memory)
 * and names the shop the dashboard works in (lib/active-shop): passes carry no shop. A pass the
 * API refuses is renewed at Accounts once and the request tried again; when the sign-in is over,
 * the tab leaves for the sign-in page (context/AuthContext, told by lib/accounts/pass).
 */

const RETRY_AFTER_401 = Symbol("paperbaseApiRetry401");

type AxiosCompatConfig = {
  params?: object;
  headers?: Record<string, string | undefined> | Headers;
  responseType?: "json" | "blob" | "text";
  signal?: AbortSignal;
  timeout?: number;
  [RETRY_AFTER_401]?: boolean;
};

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

/** The shop the dashboard works in, for the person whose pass this tab holds. */
export function currentShop(): string | null {
  return activeShop(heldClaims()?.sub);
}

/** The pass and the shop, for a request. */
export async function signInHeaders(): Promise<Headers> {
  const h = new Headers();
  if (typeof window === "undefined") return h;
  const pass = await passForRequest();
  if (pass) h.set("Authorization", `Bearer ${pass}`);
  const shop = currentShop();
  if (shop) h.set("X-Store-Public-ID", shop);
  return h;
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

async function executeRequest<T>(
  method: string,
  path: string,
  body: unknown,
  config: AxiosCompatConfig
): Promise<{ data: T; status: number; statusText: string; headers: Headers }> {
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

  const authHeaders = await signInHeaders();
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

  // The pass refused (run out, or its sign-in just ended): once, a fresh one and again. A sign-in
  // that is over leaves for the sign-in page by itself (lib/accounts/pass tells AuthContext).
  if (res.status === 401 && !isRetry401 && authHeaders.has("Authorization")) {
    const renewal = await renewPass();
    if (renewal.kind === "renewed") {
      return executeRequest<T>(method, path, body, { ...config, [RETRY_AFTER_401]: true });
    }
    if (renewal.kind === "unreachable") {
      throw new ApiTransportError("Accounts could not be reached to renew the pass");
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
