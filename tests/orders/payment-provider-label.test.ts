import { describe, expect, it } from "vitest";

import { formatPaymentProviderLabel } from "@/lib/orders/payment-statuses";

const t = (key: string) => `t:${key}`;

describe("the provider a prepayment was sent with", () => {
  it("names bKash and Nagad in the merchant's language", () => {
    expect(formatPaymentProviderLabel("bkash", t)).toBe("t:paymentProviderBkash");
    expect(formatPaymentProviderLabel("nagad", t)).toBe("t:paymentProviderNagad");
  });

  it("says nothing it does not know", () => {
    expect(formatPaymentProviderLabel("", t)).toBe("—");
    expect(formatPaymentProviderLabel(null, t)).toBe("—");
    expect(formatPaymentProviderLabel("paypal", t)).toBe("—");
  });
});
