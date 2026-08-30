/**
 * Local/dev: set NEXT_PUBLIC_TURNSTILE_DISABLED=1 in .env.local to hide the widget
 * and skip the client-side token check.
 *
 * This MUST be set together with the backend: either leave TURNSTILE_SECRET_KEY empty,
 * or set TURNSTILE_SKIP_VERIFICATION=true on the API. Setting only one side is the
 * confusing failure — with the widget hidden the browser sends no token, and a backend
 * that still verifies rejects the empty value with 400 "Turnstile verification failed".
 */
export function isTurnstileDisabled(): boolean {
  const v = process.env.NEXT_PUBLIC_TURNSTILE_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
