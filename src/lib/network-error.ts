import { isApiHttpError, isApiTransportError } from "@/lib/api-client";

/**
 * Returns true when the HTTP client has no HTTP response — i.e. the request never
 * reached the server (DNS failure, connection refused, timeout, offline).
 * Callers should check this *before* inspecting error.response status codes so
 * that auth/subscription-specific messages are never shown for connectivity issues.
 */
export function isNetworkError(error: unknown): boolean {
  if (isApiHttpError(error)) return false;
  return isApiTransportError(error);
}
