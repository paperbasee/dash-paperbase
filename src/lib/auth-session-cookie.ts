/**
 * Single source of truth for the `auth_session` browser cookie.
 *
 * This is NOT the JWT itself — it is only a hint that a session exists,
 * read by the Next.js proxy ([src/proxy.ts]) to gate non-public routes.
 * The Django backend independently verifies the JWT on every API call.
 *
 * The cookie's lifetime is aligned with `REFRESH_TOKEN_LIFETIME` (15 days)
 * so that closing/reopening the browser does not surface a logout while
 * the refresh token is still valid.
 *
 * `SameSite=Lax` is intentional (not Strict): we want the cookie to be
 * sent on top-level navigations from external sites (e.g. links in
 * verification emails) so users land on the dashboard, not /login.
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
