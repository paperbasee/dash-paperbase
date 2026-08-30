/**
 * Strip the cosmetic zero-padding from a stored order number for display.
 *
 *   00000004  -> "4"
 *   00010000  -> "10000"
 *   100000000 -> "100000000"
 *
 * Only leading zeros that precede another digit are removed, so non-numeric
 * identifiers (e.g. "ord_ab12") and empty values are returned unchanged.
 */
export function formatOrderNumber(orderNumber?: string | number | null): string {
  return String(orderNumber ?? "").trim().replace(/^0+(?=\d)/, "");
}
