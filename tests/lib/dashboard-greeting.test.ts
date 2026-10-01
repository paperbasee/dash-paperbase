import { describe, expect, it } from "vitest";

import { greetingName, updatedAgo } from "@/lib/dashboard/greeting";

describe("the home page's greeting", () => {
  it("greets the person signed in by their own first name", () => {
    expect(greetingName({ first_name: " Karim ", full_name: "Karim Hossain" })).toBe("Karim");
    expect(greetingName({ first_name: "", full_name: "Nadia Islam" })).toBe("Nadia");
  });

  it("has no name rather than someone else's", () => {
    expect(greetingName({ first_name: "", full_name: "  " })).toBe("");
    expect(greetingName(null)).toBe("");
  });

  it("says how long ago the numbers were fetched", () => {
    const at = new Date(1_000_000);
    expect(updatedAgo(null, 0)).toBeNull();
    expect(updatedAgo(at, at.getTime() + 10_000)).toEqual({ unit: "now" });
    expect(updatedAgo(at, at.getTime() + 5 * 60_000)).toEqual({ unit: "minutes", count: 5 });
    expect(updatedAgo(at, at.getTime() + 125 * 60_000)).toEqual({ unit: "hours", count: 2 });
  });
});
