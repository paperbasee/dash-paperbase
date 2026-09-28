import { describe, expect, it } from "vitest";

import { suggestEmail } from "@/lib/email-typo";

const fix = (typed: string) => suggestEmail(typed)?.email ?? null;

describe("suggestEmail", () => {
  it("catches the slips people make in a provider", () => {
    expect(fix("nusrat@gmial.com")).toBe("nusrat@gmail.com");
    expect(fix("nusrat@gmai.com")).toBe("nusrat@gmail.com");
    expect(fix("nusrat@gmail.con")).toBe("nusrat@gmail.com");
    expect(fix("nusrat@gmail.co")).toBe("nusrat@gmail.com");
    expect(fix("nusrat@gmailcom")).toBe("nusrat@gmail.com");
    expect(fix("nusrat@gmial.con")).toBe("nusrat@gmail.com");
    expect(fix("nusrat@yahooo.com")).toBe("nusrat@yahoo.com");
    expect(fix("nusrat@hotmial.com")).toBe("nusrat@hotmail.com");
    expect(fix("nusrat@outlok.com")).toBe("nusrat@outlook.com");
    expect(fix("nusrat@icloud.co")).toBe("nusrat@icloud.com");
  });

  it("finishes a provider typed without its ending, and drops a dot too many", () => {
    expect(fix("nusrat@gmail")).toBe("nusrat@gmail.com");
    expect(fix("nusrat@yahoo")).toBe("nusrat@yahoo.com");
    expect(fix("nusrat@gmail.com.")).toBe("nusrat@gmail.com");
  });

  it("keeps the name before the @ exactly as typed, and says which part changed", () => {
    expect(suggestEmail("  Nusrat.Jahan+shop@GMIAL.COM ")).toEqual({
      email: "Nusrat.Jahan+shop@gmail.com",
      domain: "gmail.com",
    });
  });

  it("leaves a right address alone, whatever its case", () => {
    for (const typed of ["nusrat@gmail.com", "nusrat@GMAIL.COM", "a@yahoo.com", "a@proton.me", "a@outlook.com"]) {
      expect(fix(typed)).toBeNull();
    }
  });

  it("never corrects a real provider that sits close to another", () => {
    for (const typed of ["a@mail.com", "a@email.com", "a@ymail.com", "a@me.com", "a@aol.com", "a@yahoo.co.uk"]) {
      expect(fix(typed)).toBeNull();
    }
  });

  it("never corrects a shop's own domain", () => {
    for (const typed of ["owner@glowtheory.com", "owner@shop.com.bd", "owner@paperbase.me", "owner@company", "a@abc.com"]) {
      expect(fix(typed)).toBeNull();
    }
  });

  it("waits for an address to be one", () => {
    for (const typed of ["", "nusrat", "nusrat@", "@gmail.com"]) {
      expect(fix(typed)).toBeNull();
    }
  });
});
