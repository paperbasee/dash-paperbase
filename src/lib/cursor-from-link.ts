/**
 * Extract the `cursor` query value from a DRF cursor pagination ``next`` or ``previous`` URL.
 */
export function cursorFromLink(href: string | null | undefined): string | null {
  if (!href || typeof href !== "string") return null;
  const base =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "";
  try {
    const u = new URL(href, base || undefined);
    return u.searchParams.get("cursor");
  } catch {
    return null;
  }
}
