/**
 * The media store's origin for the dashboard's Content-Security-Policy -- in
 * DEVELOPMENT only.
 *
 * Locally the media store is MinIO at http://localhost:9000: pictures load from
 * it and the dashboard's direct uploads PUT to it, and neither is `'self'`,
 * `https:` or the API. In production media is on R2 over https, which
 * `img-src https:` and the r2 `connect-src` entry already cover, so production
 * gets nothing here and its header does not change.
 */
export const LOCAL_MEDIA_ORIGIN = "http://localhost:9000";

export function devMediaOrigin(isDev: boolean, mediaBaseUrl: string | undefined): string {
  if (!isDev) return "";
  const raw = (mediaBaseUrl ?? "").trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      // A value that is not a URL falls back like an unset one.
    }
  }
  return LOCAL_MEDIA_ORIGIN;
}
