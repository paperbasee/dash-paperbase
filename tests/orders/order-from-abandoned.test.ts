import { describe, expect, it } from "vitest";

import { orderFromAbandoned } from "@/lib/orders/order-from-abandoned";
import type { AbandonedCheckout } from "@/types";

const row: AbandonedCheckout = {
  id: 7,
  cart_public_id: "crt_1",
  account_public_id: null,
  name: "Rahim",
  phone: "01712345678",
  email: "",
  shipping_address: "House 12, Road 4, Mirpur",
  district: "Dhaka",
  items: [
    { name: "Panjabi", variant: "PJ-XL", product_public_id: "prd_1", variant_public_id: "var_1", quantity: 2, unit_price: "1200.00" },
    { name: "Gone", variant: "", product_public_id: "", variant_public_id: null, quantity: 1, unit_price: "10.00" },
  ],
  item_count: 3,
  value: "2410.00",
  created_at: "2026-09-27T08:00:00Z",
  updated_at: "2026-09-27T08:00:00Z",
};

describe("converting an abandoned checkout", () => {
  it("starts from what the shopper typed", () => {
    const { form } = orderFromAbandoned(row);
    expect(form).toMatchObject({ shipping_name: "Rahim", phone: "01712345678", district: "Dhaka" });
    // The storefront's "address line, thana": the last part is the thana.
    expect(form.thana).toBe("Mirpur");
    expect(form.village).toBe("House 12, Road 4");
  });

  it("starts from their basket, at the prices they saw", () => {
    const { items } = orderFromAbandoned(row);
    expect(items).toEqual([
      {
        product_public_id: "prd_1",
        product_name: "Panjabi",
        product_image: null,
        variant_public_id: "var_1",
        quantity: 2,
        unit_price: "1200.00",
      },
    ]);
  });
});
