import type { ShippingMethod, ShippingRate } from "@/types";

/**
 * The delivery areas a shop can charge for.
 *
 * An area is priced when an active rate for it belongs to an active method that
 * delivers there -- a method listing no areas delivers everywhere. The same rule
 * the API's quote applies (`engine/apps/shipping/service.py`). An area without
 * one is charged nothing at checkout, which the Shipping screen says beside it
 * (2026-09-27).
 */
export function pricedZoneIds(
  methods: readonly Pick<ShippingMethod, "public_id" | "is_active" | "zone_public_ids">[],
  rates: readonly Pick<ShippingRate, "shipping_method_public_id" | "shipping_zone_public_id" | "is_active">[],
): Set<string> {
  const methodByPublicId = new Map(methods.map((m) => [m.public_id, m] as const));
  const out = new Set<string>();
  for (const r of rates) {
    if (!r.is_active) continue;
    const method = methodByPublicId.get(r.shipping_method_public_id);
    if (!method || !method.is_active) continue;
    const served = Array.isArray(method.zone_public_ids) ? method.zone_public_ids : [];
    if (served.length > 0 && !served.includes(r.shipping_zone_public_id)) continue;
    out.add(r.shipping_zone_public_id);
  }
  return out;
}
