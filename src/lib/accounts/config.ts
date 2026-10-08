/**
 * Accounts (accounts-paperbase), where everyone signs in (guidelines/accounts-plan.md): its
 * address, and how the dashboard is known to it. The dashboard is a public client of its OpenID
 * Connect: no secret, PKCE instead, and its return address registered there as
 * `<DASHBOARD_URL>/auth/callback`.
 */

/** The dashboard's name at Accounts (accounts-paperbase settings.DASHBOARD_CLIENT_ID). */
export const CLIENT_ID = "paperbase-dashboard";

/** Who, the names and picture, the email and the phone (accounts.md, "What a client learns"). */
export const SCOPES = "openid profile email phone";

/** Accounts' address, e.g. https://accounts.paperbase.me; "" when this dashboard has none. */
export function accountsUrl(): string {
  return (process.env.NEXT_PUBLIC_ACCOUNTS_URL ?? "").trim().replace(/\/+$/, "");
}

/** Where Accounts sends people back: the address registered for the dashboard. */
export function callbackUrl(origin: string = window.location.origin): string {
  return `${origin}/auth/callback`;
}

/** "Your Paperbase account" at Accounts: name, phone, picture and passkeys. */
export function accountPageUrl(): string {
  return `${accountsUrl()}/account`;
}
