/**
 * The storefront preview host the editor frames, from
 * NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN (for example https://preview.paperbase.me).
 *
 * Returns the bare origin, or null when unset or unusable: without it the editor
 * cannot show the shop, so nothing offers to open it. Plain http is accepted only
 * for a localhost name, for local testing.
 *
 * Next inlines a NEXT_PUBLIC_ variable only where it is written out in full, so
 * callers pass `process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN` in.
 */
export function previewOrigin(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const localhost = url.hostname === "localhost" || url.hostname.endsWith(".localhost");
  if (url.protocol === "https:" || (url.protocol === "http:" && localhost)) return url.origin;
  return null;
}
