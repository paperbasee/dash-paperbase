import { describe, expect, it } from "vitest";
import { orderCreateSchema } from "@/lib/validation/order";

describe("order schema", () => {
  it("accepts valid order payload", () => {
    const result = orderCreateSchema.safeParse({
      shipping_name: "John",
      phone: "01712345678",
      email: "john@example.com",
      shipping_address: "Dhaka",
      district: "Dhaka",
      shipping_zone_public_id: "szn_abc123",
      shipping_method_public_id: "",
      items: [
        {
          product_public_id: "1",
          variant_public_id: null,
          quantity: 1,
          price: "100",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects order without items", () => {
    const result = orderCreateSchema.safeParse({
      shipping_name: "John",
      phone: "01712345678",
      email: "john@example.com",
      shipping_address: "Dhaka",
      district: "Dhaka",
      shipping_zone_public_id: "szn_abc123",
      shipping_method_public_id: "",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects order without delivery zone", () => {
    const result = orderCreateSchema.safeParse({
      shipping_name: "John",
      phone: "01712345678",
      email: "john@example.com",
      shipping_address: "Dhaka",
      district: "Dhaka",
      shipping_zone_public_id: "",
      shipping_method_public_id: "",
      items: [
        {
          product_public_id: "1",
          variant_public_id: null,
          quantity: 1,
          price: "100",
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
