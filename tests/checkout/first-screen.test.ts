/**
 * Where the plan payment page opens, from Paperbase's own numbers (owner, 2026-10-03): never a
 * form with no number to pay to.
 */
import { describe, expect, it } from "vitest";

import { firstScreen } from "@/lib/checkout/first-screen";

const BKASH = "01712345678";
const NAGAD = "01812345678";

describe("the plan payment page's first screen", () => {
  it("with both numbers, the merchant picks, or keeps what they picked", () => {
    expect(firstScreen({ bkash_number: BKASH, nagad_number: NAGAD }, null)).toEqual({ screen: "selectProvider" });
    expect(firstScreen({ bkash_number: BKASH, nagad_number: NAGAD }, "nagad")).toEqual({ screen: "form", provider: "nagad" });
    expect(firstScreen({ bkash_number: BKASH, nagad_number: NAGAD }, "card")).toEqual({ screen: "selectProvider" });
  });

  it("with one, straight to it -- whatever was picked before", () => {
    expect(firstScreen({ bkash_number: BKASH, nagad_number: "" }, "nagad")).toEqual({ screen: "form", provider: "bkash" });
    expect(firstScreen({ bkash_number: "  ", nagad_number: NAGAD }, null)).toEqual({ screen: "form", provider: "nagad" });
  });

  it("with none, a page that says payment is not set up", () => {
    expect(firstScreen({ bkash_number: "", nagad_number: "" }, "bkash")).toEqual({ screen: "notSetUp" });
    expect(firstScreen({}, null)).toEqual({ screen: "notSetUp" });
  });
});
