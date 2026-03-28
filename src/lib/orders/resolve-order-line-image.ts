/**
 * Build a browser-loadable URL for order line product images.
 *
 * The API returns Django `FileField.url` values, usually paths like `/media/products/...`.
 * `NEXT_PUBLIC_API_URL` is typically the REST base (e.g. `http://host:8000/api/v1`), but
 * media is served at the site root (`http://host:8000/media/...`). Joining base + path
 * incorrectly produces `/api/v1/media/...` and images 404.
 */
export function resolveOrderLineImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  if (!apiBase) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  try {
    const parsed = new URL(apiBase);
    const origin = parsed.origin;
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${origin}${path}`;
  } catch {
    const base = apiBase.replace(/\/$/, "");
    const path = trimmed.replace(/^\//, "");
    return `${base}/${path}`;
  }
}
