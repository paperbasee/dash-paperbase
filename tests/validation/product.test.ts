import { describe, expect, it } from "vitest";
import {
  productCreateSchema,
  slugFromName,
  validateExtraFieldDefinitions,
  validateRequiredExtraFields,
} from "@/lib/validation/product";

describe("product validation", () => {
  it("generates stable slug from name", () => {
    expect(slugFromName("  Wireless Earbuds Pro!! ")).toBe("wireless-earbuds-pro");
  });

  it("accepts valid product create payload", () => {
    const result = productCreateSchema.safeParse({
      name: "Product",
      brand: "Brand",
      price: "10",
      category: "1",
      sub_category: "",
      stock: "3",
      description: "",
      original_price: "",
      badge: "",
      is_featured: false,
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it("returns required extra field errors", () => {
    const errors = validateRequiredExtraFields(
      [{ name: "color", required: true }],
      { color: "" }
    );
    expect(errors.color).toBe("This field is required.");
  });

  it("detects duplicate dynamic field names by normalized key", () => {
    const result = validateExtraFieldDefinitions([
      {
        id: "1",
        entityType: "product",
        name: "Color Name",
        fieldType: "text",
        required: false,
        order: 0,
      },
      {
        id: "2",
        entityType: "product",
        name: "color_name",
        fieldType: "text",
        required: false,
        order: 1,
      },
    ]);
    expect(result.success).toBe(false);
  });
});
