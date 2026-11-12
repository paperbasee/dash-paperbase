import { describe, expect, it } from "vitest";

import { greetingName } from "@/lib/dashboard/greeting";

describe("the home page's greeting", () => {
  it("greets the person signed in by their own first name", () => {
    expect(greetingName({ first_name: " Karim ", full_name: "Karim Hossain" })).toBe("Karim");
    expect(greetingName({ first_name: "", full_name: "Nadia Islam" })).toBe("Nadia");
  });

  it("has no name rather than someone else's", () => {
    expect(greetingName({ first_name: "", full_name: "  " })).toBe("");
    expect(greetingName(null)).toBe("");
  });
});
