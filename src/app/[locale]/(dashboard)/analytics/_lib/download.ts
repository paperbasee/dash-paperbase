/**
 * The name a downloaded analytics file is saved under: the one the API gives
 * it (Content-Disposition), or the fallback when the header is missing.
 */
export function fileNameFrom(disposition: string | undefined | null, fallback: string): string {
  const match = /filename="?([^";]+)"?/i.exec(disposition ?? "");
  return match?.[1]?.trim() || fallback;
}
