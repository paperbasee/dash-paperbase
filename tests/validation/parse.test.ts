import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseValidation } from "@/lib/validation/parse";

describe("parseValidation", () => {
  it("returns typed data on success", () => {
    const schema = z.object({
      name: z.string().min(1),
    });

    const result = parseValidation(schema, { name: "ok" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("ok");
    }
  });

  it("returns field-mapped errors on failure", () => {
    const schema = z.object({
      email: z.string().email("Invalid email"),
    });

    const result = parseValidation(schema, { email: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBe("Invalid email");
    }
  });
});
