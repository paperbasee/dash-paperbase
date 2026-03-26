import { routing } from "@/i18n/routing";

export const PENDING_VERIFICATION_EMAIL_KEY = "pending_verification_email";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getPendingVerificationEmail(): string {
  if (!isBrowser()) return "";
  return normalizeEmail(localStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) ?? "");
}

export function setPendingVerificationEmail(email: string): void {
  if (!isBrowser()) return;
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalized);
}

export function clearPendingVerificationEmail(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function normalizePathForAuthChecks(pathname: string): string {
  const localePrefixPattern = new RegExp(
    `^\\/(${routing.locales.join("|")})(?=\\/|$)`
  );
  const match = pathname.match(localePrefixPattern);
  if (!match) return pathname || "/";
  const rest = pathname.slice(match[0].length);
  if (!rest || rest === "/") return "/";
  return rest.startsWith("/") ? rest : `/${rest}`;
}

export function isVerifyEmailRoute(pathname: string): boolean {
  const normalized = normalizePathForAuthChecks(pathname);
  return (
    normalized === "/verify-email" ||
    normalized.startsWith("/verify-email/") ||
    normalized === "/auth/verify-email" ||
    normalized.startsWith("/auth/verify-email/")
  );
}
