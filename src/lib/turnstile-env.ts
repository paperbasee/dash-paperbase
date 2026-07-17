/**
 * Hides the Turnstile widget and skips the client-side token gate.
 *
 * TEMP: defaults to disabled for now, so login/signup are not blocked by a
 * missing/failed Turnstile response. Set NEXT_PUBLIC_TURNSTILE_DISABLED=0
 * (or false/no/off) to re-enable the widget and client-side check. This must
 * stay in sync with TURNSTILE_SKIP_VERIFICATION on the API.
 */
export function isTurnstileDisabled(): boolean {
  const v = process.env.NEXT_PUBLIC_TURNSTILE_DISABLED?.trim().toLowerCase();
  if (v === undefined || v === "") {
    return true;
  }
  return !(v === "0" || v === "false" || v === "no" || v === "off");
}
