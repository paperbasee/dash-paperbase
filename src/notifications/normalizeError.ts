import axios from "axios";
import type { FieldErrors, NormalizedError } from "./types";

const SAFE_FALLBACK = "Something went wrong. Please try again.";

function sanitizeMessage(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  if (value.startsWith("{") || value.startsWith("[")) return null;
  const lower = value.toLowerCase();
  if (lower.includes("traceback") || lower.includes("select *") || lower.includes("sql")) {
    return null;
  }
  return value;
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

export function normalizeError(error: unknown, fallbackMessage?: string): NormalizedError {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    const detail = sanitizeMessage((responseData as { detail?: unknown } | undefined)?.detail);
    const message = detail ?? sanitizeMessage(error.message) ?? fallbackMessage ?? SAFE_FALLBACK;
    const fieldErrors = flattenFieldErrors(responseData);
    const code = sanitizeMessage((responseData as { code?: unknown } | undefined)?.code) ?? undefined;
    return {
      message,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      code: code ?? error.code,
      raw: responseData ?? error,
    };
  }

  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const detail = sanitizeMessage(obj.detail);
    const message = detail ?? sanitizeMessage(obj.message) ?? fallbackMessage ?? SAFE_FALLBACK;
    const fieldErrors = flattenFieldErrors(obj);
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
