import axios from "axios";

/**
 * Returns true when an Axios error has no response — i.e. the request never
 * reached the server (DNS failure, connection refused, timeout, offline).
 * Callers should check this *before* inspecting error.response status codes so
 * that auth/subscription-specific messages are never shown for connectivity issues.
 */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
