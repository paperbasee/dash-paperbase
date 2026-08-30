const baseUrl = (): string => process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * THIS instance's public API origin (scheme+host, no path), derived from
 * NEXT_PUBLIC_API_URL by stripping the trailing /api/v1. Use for user-facing URLs that
 * must point at the tenant's own API (public API base shown to merchants, courier webhook
 * callbacks) — never hardcode a paperbase host, which would misroute on other instances.
 */
export function apiOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/api\/v1$/, "");
  }
}

export function joinBasePath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = baseUrl().replace(/\/$/, "");
  const p = path.replace(/^\//, "");
  return base ? `${base}/${p}` : `/${p}`;
}

function appendQuery(url: string, params?: object): string {
  if (!params) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v as string | number | boolean));
  }
  const qs = sp.toString();
  if (!qs) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
}

/** Absolute request URL with optional query string (same rules as {@link joinBasePath}). */
export function buildApiUrl(
  path: string,
  params?: object
): string {
  return appendQuery(joinBasePath(path), params);
}

function extractDetailMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0 && typeof detail[0] === "string") {
    return detail[0];
  }
  return null;
}

/** Thrown when `fetch()` fails before an HTTP response is available (offline, DNS, CORS, etc.). */
export class ApiTransportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiTransportError";
  }
}

/** Thrown for non-2xx HTTP responses from the API; carries parsed JSON (when possible) like Axios `response.data`. */
export class ApiHttpError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.data = data;
  }

  /** Shape compatible with legacy `error.response` for migrated call sites. */
  get response(): { status: number; data: unknown } {
    return { status: this.status, data: this.data };
  }
}

export function isApiHttpError(error: unknown): error is ApiHttpError {
  return error instanceof ApiHttpError;
}

export function isApiTransportError(error: unknown): error is ApiTransportError {
  return error instanceof ApiTransportError;
}

/**
 * Low-level JSON request helper: native `fetch`, default JSON content type, Bearer optional.
 * On non-ok: parses body for DRF `detail`, else `HTTP {status}`; throws {@link ApiHttpError}.
 */
export async function request<T>(
  path: string,
  options: RequestInit = {},
  bearerToken?: string | null
): Promise<T> {
  const url = buildApiUrl(path);
  const headers = new Headers(options.headers);

  const body = options.body;
  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (bearerToken) {
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (cause) {
    throw new ApiTransportError(
      cause instanceof Error ? cause.message : "Network request failed",
      { cause: cause instanceof Error ? cause : undefined }
    );
  }

  const text = await res.text();

  if (!res.ok) {
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = text;
      }
    }
    const fromDetail = extractDetailMessage(parsed);
    const message = fromDetail ?? `HTTP ${res.status}`;
    throw new ApiHttpError(message, res.status, parsed);
  }

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const apiClient = {
  get<T>(path: string, token?: string | null) {
    return request<T>(path, { method: "GET" }, token);
  },

  post<T>(path: string, body?: unknown, token?: string | null) {
    const init: RequestInit = { method: "POST" };
    if (body !== undefined && body !== null) {
      init.body = body instanceof FormData ? body : JSON.stringify(body);
    }
    return request<T>(path, init, token);
  },

  patch<T>(path: string, body?: unknown, token?: string | null) {
    const init: RequestInit = { method: "PATCH" };
    if (body !== undefined && body !== null) {
      init.body = body instanceof FormData ? body : JSON.stringify(body);
    }
    return request<T>(path, init, token);
  },

  put<T>(path: string, body?: unknown, token?: string | null) {
    const init: RequestInit = { method: "PUT" };
    if (body !== undefined && body !== null) {
      init.body = body instanceof FormData ? body : JSON.stringify(body);
    }
    return request<T>(path, init, token);
  },

  delete<T>(path: string, token?: string | null) {
    return request<T>(path, { method: "DELETE" }, token);
  },
};
