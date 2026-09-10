/**
 * Post-auth "return to" (`next`) redirect handling, hardened against
 * open-redirect phishing.
 *
 * A `next` value is only honored when it points *inside* this app. We reject
 * absolute URLs, protocol-relative targets (`//evil.com`), backslash tricks
 * (`/\evil.com`, which some browsers normalize to `//`), and control
 * characters. The value keeps its query string and hash so links like
 * `/team/invite?token=…` round-trip intact.
 *
 * The returned path is also LOCALE-FREE. Every consumer pushes it through
 * next-intl's locale-aware router, which prepends the active locale itself, so a
 * `next` that still carries one produces `/en/en/settings`. proxy.ts wrote the
 * un-stripped pathname for a long time, so stripping here rather than only at the
 * source also fixes links already sitting in bookmarks, open tabs and old emails.
 */

/** Locales from src/i18n/routing.ts. Kept literal: importing routing here would
 *  pull next-intl into a module that middleware-adjacent code also uses. */
const LOCALE_SEGMENTS = ["en", "bn"] as const;

/**
 * Drop a leading `/en` or `/bn`, and only when it is a whole path segment.
 * `/energy` and `/bnpl` must survive untouched.
 */
function stripLocalePrefix(value: string): string {
  for (const locale of LOCALE_SEGMENTS) {
    if (value === `/${locale}`) return "/";
    if (value.startsWith(`/${locale}/`)) return value.slice(locale.length + 1);
    // A locale immediately followed by ? or # is still a whole segment.
    if (value.startsWith(`/${locale}?`) || value.startsWith(`/${locale}#`)) {
      return `/${value.slice(locale.length + 1)}`;
    }
  }
  return value;
}

export function getSafeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw;
  // The param is typically encodeURIComponent'd once; decode defensively.
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!value.startsWith("/")) return null; // must be root-relative
  // Second char cannot start another host: `//host` or `/\host`.
  if (value.length > 1 && (value[1] === "/" || value[1] === "\\")) return null;
  // Reject control characters (codepoint < 0x20) that could smuggle in tricks.
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x20) return null;
  }
  // Strip AFTER the safety checks, so the checks always see the raw value.
  return stripLocalePrefix(value);
}

/**
 * Append a validated `next` to an internal auth path (preserving any existing
 * query). No-op when `next` is missing or unsafe, so links stay clean.
 */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = getSafeNextPath(next);
  if (!safe) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}next=${encodeURIComponent(safe)}`;
}
