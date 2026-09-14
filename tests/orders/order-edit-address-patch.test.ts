import { describe, expect, it } from "vitest";
import {
  orderEditAddressPatch,
  splitShippingAddressForForm,
} from "@/lib/orders/shipping-address-parts";

/** The editor form as startEditing builds it from a stored order. */
function formFor(shippingAddress: string, district: string) {
  return { ...splitShippingAddressForForm(shippingAddress, district), district };
}

describe("orderEditAddressPatch", () => {
  it("lets an unchanged minimal-checkout order save without touching the address", () => {
    // The owner's report: only thana is stored, the merchant removes an item and presses Save.
    const initial = formFor("Mirpur", "Dhaka");
    expect(orderEditAddressPatch({ ...initial }, initial)).toEqual({ error: null, patch: null });
  });

  it("ignores whitespace-only differences", () => {
    const initial = formFor("House 12, Mirpur", "Dhaka");
    const form = { village: " House 12 ", thana: "Mirpur ", district: " Dhaka" };
    expect(orderEditAddressPatch(form, initial)).toEqual({ error: null, patch: null });
  });

  it("asks for the thana when the merchant cleared it", () => {
    const initial = formFor("House 12, Mirpur", "Dhaka");
    expect(orderEditAddressPatch({ ...initial, thana: "  " }, initial)).toEqual({
      error: "thana",
      patch: null,
    });
  });

  it("asks for the district when the merchant cleared it", () => {
    const initial = formFor("House 12, Mirpur", "Dhaka");
    expect(orderEditAddressPatch({ ...initial, district: "" }, initial)).toEqual({
      error: "district",
      patch: null,
    });
  });

  it("sends the joined address when the merchant changed the village", () => {
    const initial = formFor("Mirpur", "Dhaka");
    expect(orderEditAddressPatch({ ...initial, village: "House 12, Road 5" }, initial)).toEqual({
      error: null,
      patch: { shipping_address: "House 12, Road 5, Mirpur, Dhaka", district: "Dhaka" },
    });
  });

  it("checks and sends the address when there is no initial form", () => {
    const form = { village: "", thana: "Mirpur", district: " Dhaka " };
    expect(orderEditAddressPatch(form, null)).toEqual({
      error: null,
      patch: { shipping_address: "Mirpur, Dhaka", district: "Dhaka" },
    });
  });
});
