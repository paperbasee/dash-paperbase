/**
 * Whether the store settings row carries the storefront integration fields
 * (storefront_url / revalidate_secret). The API only returns them in
 * single-store mode; under host routing it omits both keys because cache
 * purges go to a platform-configured storefront address instead.
 *
 * Key presence is the signal: in single-store mode the values may be "" or
 * null and the block is still available.
 */
export function storefrontIntegrationAvailable(row: unknown): boolean {
  if (typeof row !== "object" || row === null) return false;
  return (
    Object.prototype.hasOwnProperty.call(row, "storefront_url") ||
    Object.prototype.hasOwnProperty.call(row, "revalidate_secret")
  );
}
