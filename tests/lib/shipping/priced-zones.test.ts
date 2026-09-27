import { describe, expect, it } from "vitest";

import { pricedZoneIds } from "@/lib/shipping/priced-zones";

const method = (public_id: string, zone_public_ids: string[] = [], is_active = true) => ({
  public_id,
  zone_public_ids,
  is_active,
});
const rate = (method: string, zone: string, is_active = true) => ({
  shipping_method_public_id: method,
  shipping_zone_public_id: zone,
  is_active,
});

describe("which delivery areas have a price", () => {
  it("an area with an active rate on an active method is priced", () => {
    expect(pricedZoneIds([method("m1")], [rate("m1", "inside")])).toEqual(new Set(["inside"]));
  });

  it("an area with no rate is not", () => {
    const priced = pricedZoneIds([method("m1")], [rate("m1", "inside")]);
    expect(priced.has("outside")).toBe(false);
  });

  it("a rate on a method that does not deliver there does not count", () => {
    // Inside Dhaka's method with a rate filed under Outside Dhaka: checkout
    // cannot use it there, so the area is still unpriced.
    expect(pricedZoneIds([method("m1", ["inside"])], [rate("m1", "outside")]).size).toBe(0);
  });

  it("switched-off rates and methods do not count", () => {
    expect(pricedZoneIds([method("m1")], [rate("m1", "inside", false)]).size).toBe(0);
    expect(pricedZoneIds([method("m1", [], false)], [rate("m1", "inside")]).size).toBe(0);
  });
});
