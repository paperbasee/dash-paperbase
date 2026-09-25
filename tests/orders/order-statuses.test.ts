import { describe, expect, it } from "vitest";

import {
  formatOrderStatusLabel,
  orderStatusOptionReading,
  shownOrderStatus,
} from "@/lib/orders/order-statuses";

const t = (key: string) => `t:${key}`;

describe("an order waiting on a prepayment", () => {
  it("reads Payment pending until the shopper sends the reference", () => {
    expect(shownOrderStatus({ status: "payment_pending", payment_status: "none" })).toBe(
      "payment_pending",
    );
  });

  it("reads Payment submitted once they have", () => {
    const order = { status: "payment_pending", payment_status: "submitted" };
    expect(shownOrderStatus(order)).toBe("payment_submitted");
    expect(formatOrderStatusLabel(shownOrderStatus(order), t)).toBe("t:orderStatusPaymentSubmitted");
  });

  it("reads Confirmed once the merchant verifies it", () => {
    expect(shownOrderStatus({ status: "confirmed", payment_status: "verified" })).toBe("confirmed");
  });

  it("reads Payment pending again after a refused reference the shopper may resend", () => {
    expect(shownOrderStatus({ status: "payment_pending", payment_status: "failed" })).toBe(
      "payment_pending",
    );
  });

  it("leaves every other status alone", () => {
    expect(shownOrderStatus({ status: "pending", payment_status: "submitted" })).toBe("pending");
    expect(shownOrderStatus({ status: "cancelled", payment_status: "failed" })).toBe("cancelled");
    expect(shownOrderStatus({ status: "pending" })).toBe("pending");
  });
});

describe("the status picker", () => {
  const order = { status: "payment_pending", payment_status: "submitted" };

  it("labels the order's own option the way the order reads", () => {
    expect(orderStatusOptionReading(order, "payment_pending")).toBe("payment_submitted");
  });

  it("labels the other options as themselves", () => {
    expect(orderStatusOptionReading(order, "cancelled")).toBe("cancelled");
    expect(orderStatusOptionReading(order, "pending")).toBe("pending");
  });
});
