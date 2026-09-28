import { describe, expect, it } from "vitest";
import { accountSettingsSchema } from "@/lib/validation/store";

describe("store validation", () => {
  it("rejects account settings with empty owner name", () => {
    const result = accountSettingsSchema.safeParse({
      ownerName: "",
    });
    expect(result.success).toBe(false);
  });
});
