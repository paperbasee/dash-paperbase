import type { FieldErrors, NormalizedError } from "./types";
import { isApiHttpError } from "@/lib/api-client";

const SAFE_FALLBACK = "Something went wrong. Please try again.";

function sanitizeMessage(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  // JSON or a Python list repr, and HTML error pages (a proxy or Django 500 page).
  if (value.startsWith("{") || value.startsWith("[") || value.startsWith("<")) return null;
  const lower = value.toLowerCase();
  if (lower.includes("traceback") || lower.includes("select *") || lower.includes("sql")) {
    return null;
  }
  return value;
}

function extractApiMessage(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string") return sanitizeMessage(payload);
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const msg = extractApiMessage(item);
      if (msg) return msg;
    }
    return null;
  }
  if (typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;

  const direct =
    sanitizeMessage(obj.detail) ??
    sanitizeMessage(obj.message) ??
    sanitizeMessage(obj.error);
  if (direct) return direct;

  // Some APIs return nested detail objects/arrays:
  // { detail: { detail: "..." } } or { detail: ["..."] }.
  const nestedDetail = extractApiMessage(obj.detail);
  if (nestedDetail) return nestedDetail;

  return null;
}

function flattenFieldErrors(value: unknown, prefix = "", out: FieldErrors = {}): FieldErrors {
  if (!value) return out;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    if (prefix && typeof first === "string" && !out[prefix]) {
      out[prefix] = first;
    }
    return out;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === "detail" || key === "message" || key === "code") continue;
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(nested)) {
        const first = nested.find((item) => typeof item === "string");
        if (typeof first === "string" && !out[nextKey]) out[nextKey] = first;
      } else if (typeof nested === "string") {
        if (!out[nextKey]) out[nextKey] = nested;
      } else {
        flattenFieldErrors(nested, nextKey, out);
      }
    }
  }
  return out;
}

/** The fetch clients set `HTTP 400` etc. as the message when the body has no detail. */
const BARE_HTTP_STATUS = /^HTTP \d{3}$/;

/** A client-set error message, unless it is only a bare HTTP status. */
function sanitizeClientMessage(input: unknown): string | null {
  const value = sanitizeMessage(input);
  return value && !BARE_HTTP_STATUS.test(value) ? value : null;
}

/** The first readable field error, e.g. {"items": ["Selected product is unavailable."]}. */
function firstFieldErrorMessage(fieldErrors: FieldErrors): string | null {
  for (const value of Object.values(fieldErrors)) {
    const msg = sanitizeMessage(value);
    if (msg) return msg;
  }
  return null;
}

export function normalizeError(error: unknown, fallbackMessage?: string): NormalizedError {
  if (typeof error === "string") {
    return {
      message: sanitizeMessage(error) ?? fallbackMessage ?? SAFE_FALLBACK,
      raw: error,
    };
  }

  if (isApiHttpError(error)) {
    const responseData = error.response?.data;
    const fieldErrors = flattenFieldErrors(responseData);
    const message =
      extractApiMessage(responseData) ??
      firstFieldErrorMessage(fieldErrors) ??
      sanitizeClientMessage(error.message) ??
      fallbackMessage ??
      SAFE_FALLBACK;
    const code = sanitizeMessage((responseData as { code?: unknown } | undefined)?.code) ?? undefined;
    return {
      message,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      code: code ?? undefined,
      raw: responseData ?? error,
    };
  }

  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const fieldErrors = flattenFieldErrors(obj);
    const message =
      extractApiMessage(obj) ??
      // An Error subclass's own `name` ("ApiTransportError") is not a field error.
      (error instanceof Error ? null : firstFieldErrorMessage(fieldErrors)) ??
      sanitizeClientMessage(obj.message) ??
      fallbackMessage ??
      SAFE_FALLBACK;
    return {
      message,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      code: sanitizeMessage(obj.code) ?? undefined,
      raw: error,
    };
  }

  if (error instanceof Error) {
    return {
      message: sanitizeMessage(error.message) ?? fallbackMessage ?? SAFE_FALLBACK,
      raw: error,
    };
  }

  return {
    message: fallbackMessage ?? SAFE_FALLBACK,
    raw: error,
  };
}

export const UNKNOWN_ERROR_FALLBACK = SAFE_FALLBACK;
