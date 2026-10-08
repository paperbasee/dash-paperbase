/**
 * Single source of truth for the `auth_session` browser cookie.
 *
 * This is NOT the pass, nor Accounts' sign-in cookie (which lives on Accounts' address, where this
 * page cannot see it). It is only a hint that this browser is signed in, read by the Next.js proxy
 * ([src/proxy.ts]) so a signed-out visitor goes to sign in without the dashboard drawing first.
 * The API checks the pass on every call; Accounts decides whether the sign-in is still on.
 *
 * Its lifetime is Accounts' sign-in's (15 days without use), and it is set again with every pass,
 * so closing and reopening the browser does not send a signed-in person to the sign-in page.
 *
 * `SameSite=Lax` is intentional (not Strict): we want the cookie to be sent on top-level
 * navigations from external sites (e.g. links in emails) so users land on the dashboard.
 */

const FIFTEEN_DAYS_SECONDS = 15 * 24 * 60 * 60;

export function setAuthSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `auth_session=1; path=/; max-age=${FIFTEEN_DAYS_SECONDS}; SameSite=Lax`;
}

export function clearAuthSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "auth_session=; path=/; max-age=0; SameSite=Lax";
}

/** Whether this browser looks signed in (the hint only: a page then asks Accounts for a pass). */
export function hasAuthSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((part) => part === "auth_session=1");
}
