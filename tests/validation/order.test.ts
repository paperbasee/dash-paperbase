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
      delivery_area: "inside",
      tracking_number: "",
      shipping_zone: "",
      shipping_method: "",
      items: [
        {
          product_id: "1",
          variant_id: null,
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
      delivery_area: "inside",
      tracking_number: "",
      shipping_zone: "",
      shipping_method: "",
      items: [],
    });
    expect(result.success).toBe(false);
  });
});
