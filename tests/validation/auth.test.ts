import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

describe("auth schemas", () => {
  it("accepts valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid login email", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects register when passwords differ", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      passwordConfirm: "password321",
    });
    expect(result.success).toBe(false);
  });
});
