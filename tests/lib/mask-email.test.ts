import { describe, expect, it } from "vitest";
import { maskEmail } from "@/lib/mask-email";

describe("maskEmail", () => {
  it("masks a standard address Google-style", () => {
    expect(maskEmail("moderator@gmail.com")).toBe("m•••@g•••.com");
  });

  it("preserves the TLD and masks multi-label domains by first char", () => {
    expect(maskEmail("admin@paperbase.local")).toBe("a•••@p•••.local");
  });

  it("handles single-char local/domain parts", () => {
    expect(maskEmail("a@b.co")).toBe("a•••@b•••.co");
  });

  it("passes through non-email input unchanged", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email");
    expect(maskEmail("")).toBe("");
    expect(maskEmail(null)).toBe("");
    expect(maskEmail(undefined)).toBe("");
  });

  it("does not leak the full local or domain", () => {
    const masked = maskEmail("verylongname@somedomain.com");
    expect(masked).not.toContain("verylongname");
    expect(masked).not.toContain("somedomain");
    expect(masked.endsWith(".com")).toBe(true);
  });
});
