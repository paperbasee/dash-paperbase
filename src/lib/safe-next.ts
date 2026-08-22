/**
 * Post-auth "return to" (`next`) redirect handling, hardened against
 * open-redirect phishing.
 *
 * A `next` value is only honored when it points *inside* this app. We reject
 * absolute URLs, protocol-relative targets (`//evil.com`), backslash tricks
 * (`/\evil.com`, which some browsers normalize to `//`), and control
 * characters. The value keeps its query string and hash so links like
 * `/team/invite?token=…` round-trip intact.
 */

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
  return value;
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
