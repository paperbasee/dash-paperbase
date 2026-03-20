import { describe, expect, it } from "vitest";
import { phoneSchema } from "@/lib/validation/common";

describe("phoneSchema", () => {
  it("accepts valid Bangladeshi number", () => {
    const result = phoneSchema.safeParse("01712345678");
    expect(result.success).toBe(true);
  });

  it("rejects number not starting with 01", () => {
    const result = phoneSchema.safeParse("02712345678");
    expect(result.success).toBe(false);
  });

  it("rejects number with invalid length", () => {
    const result = phoneSchema.safeParse("0171234567");
    expect(result.success).toBe(false);
  });
});
