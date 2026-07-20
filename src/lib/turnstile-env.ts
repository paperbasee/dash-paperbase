/**
 * Local/dev: set NEXT_PUBLIC_TURNSTILE_DISABLED=1 in .env.local to hide the widget
 * and skip the client-side token check. Pair with TURNSTILE_SKIP_VERIFICATION on the
 * API if TURNSTILE_SECRET_KEY is set, or leave the secret empty.
 */
export function isTurnstileDisabled(): boolean {
  const v = process.env.NEXT_PUBLIC_TURNSTILE_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
