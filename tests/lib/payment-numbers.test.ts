import { describe, expect, it } from "vitest";

import { changedWallets, parsePaymentNumbers } from "@/lib/payment-numbers";

describe("Settings > Payments", () => {
  it("reads the API's answer, a missing wallet as an empty one", () => {
    expect(parsePaymentNumbers({ numbers: { bkash: "01712345678" }, prepaid_products: 3 })).toEqual({
      numbers: { bkash: "01712345678", nagad: "" },
      prepaidProducts: 3,
    });
    expect(parsePaymentNumbers(null)).toEqual({ numbers: { bkash: "", nagad: "" }, prepaidProducts: 0 });
  });

  it("sends only the wallets whose number changed, an emptied one as empty", () => {
    const saved = { bkash: "01712345678", nagad: "01812345678" };
    expect(changedWallets(saved, { bkash: " 01712345678 ", nagad: "01812345678" })).toEqual({});
    expect(changedWallets(saved, { bkash: "01912345678", nagad: "" })).toEqual({
      bkash: "01912345678",
      nagad: "",
    });
  });
});
