/**
 * When the order editors (New order page and the order detail editor) ask
 * `admin/orders/pricing-preview/` for totals, and what their totals area shows.
 *
 * The API cannot price an order without a delivery zone (it answers 400), so no
 * request is sent until one is chosen, and the totals area asks for a zone instead
 * of showing stale totals, a zero total or an endless "Calculating…".
 */

export type PricingPreviewDisplay =
  /** No priceable lines: nothing to show. */
  | "empty"
  /** Lines exist but no delivery zone is chosen: ask for one. */
  | "chooseZone"
  /** A zone is chosen and the answer has not arrived yet. */
  | "calculating"
  /** The last preview request failed (for example a variant still has to be chosen). */
  | "unavailable"
  /** Totals from the last successful preview. */
  | "totals";

export function hasDeliveryZone(zonePublicId: string | null | undefined): boolean {
  return (zonePublicId ?? "").trim() !== "";
}

/** Only an order with at least one line and a chosen delivery zone can be priced. */
export function shouldRequestPricingPreview(input: {
  lineCount: number;
  zonePublicId: string | null | undefined;
}): boolean {
  return input.lineCount > 0 && hasDeliveryZone(input.zonePublicId);
}

export function pricingPreviewDisplay(input: {
  lineCount: number;
  zonePublicId: string | null | undefined;
  hasPreview: boolean;
  failed: boolean;
}): PricingPreviewDisplay {
  if (input.lineCount <= 0) return "empty";
  // Checked before hasPreview: totals held from an earlier zone must not stay on screen.
  if (!hasDeliveryZone(input.zonePublicId)) return "chooseZone";
  if (input.hasPreview) return "totals";
  if (input.failed) return "unavailable";
  return "calculating";
}
