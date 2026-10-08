/**
 * Paperbase billing in the dashboard (lib/billing): how money and days are written, and what
 * Settings > Billing's band says in each state of the plan (owner, 2026-10-09: design B).
 */
import { describe, expect, it } from "vitest";

import {
  billingBand,
  formatBillingAmount,
  formatBillingDay,
  formatBillingMonth,
  type BillingOverview,
  type BillingPayment,
} from "@/lib/billing";
import { PAY_AHEAD_DAYS } from "@/lib/plans-compare";
import type { MeSubscription } from "@/lib/subscription-access";

function payment(fields: Partial<BillingPayment> = {}): BillingPayment {
  return {
    public_id: "pay_1",
    created_at: "2026-10-09T08:00:00Z",
    plan: "Premium",
    billing_cycle: "monthly",
    amount: "1800.00",
    currency: "BDT",
    status: "success",
    provider: "manual",
    transaction_id: "9KJ4XQ27PA",
    kind: "payment",
    ...fields,
  };
}

function overview(fields: Partial<BillingOverview> = {}): BillingOverview {
  return {
    period: { start_date: "2026-10-09", end_date: "2026-11-08" },
    products: { count: 312, limit: 500 },
    payments: [payment()],
    paid: { total: "1800.00", count: 1, since: "2026-10-09T08:00:00Z" },
    ...fields,
  };
}

function sub(fields: Partial<MeSubscription> = {}): MeSubscription {
  return {
    subscription_status: "ACTIVE",
    plan: "Premium",
    plan_public_id: "pln_premium_m",
    end_date: "2026-11-08",
    days_remaining: 18,
    is_trial: false,
    active_row_calendar_status: "ACTIVE",
    next_period: null,
    ...fields,
  };
}

describe("money and days", () => {
  it("are taka and a short date, in the reader's digits", () => {
    expect(formatBillingAmount(1800, "en")).toBe("৳1,800");
    expect(formatBillingAmount("21600.00", "en")).toBe("৳21,600");
    expect(formatBillingAmount(1800, "bn")).toBe("৳১,৮০০");
    expect(formatBillingDay("2026-11-08", "en")).toBe("8 Nov 2026");
    expect(formatBillingDay("2026-11-08T00:00:00Z", "en")).toBe("8 Nov 2026");
    expect(formatBillingDay("2026-11-08", "bn")).toMatch(/^৮/);
    // A time is its day in Bangladesh: 20:00 UTC on 8 Nov is already 9 Nov there.
    expect(formatBillingDay("2026-11-08T20:00:00Z", "en")).toBe("9 Nov 2026");
    expect(formatBillingMonth("2026-07-25T08:00:00Z", "en")).toBe("Jul 2026");
  });
});

describe("the band", () => {
  it("counts the days left of the period in force, and when the next payment is due", () => {
    const band = billingBand(sub(), null, overview());
    expect(band).toMatchObject({ lane: "active", daysLeft: 18, periodDays: 31, nextDue: "2026-11-09", action: null });
  });

  it("in the plan's last week, offers to pay for the next period: no day is lost", () => {
    expect(PAY_AHEAD_DAYS).toBe(7);
    expect(billingBand(sub({ days_remaining: PAY_AHEAD_DAYS + 1 }), null, overview())).toMatchObject({
      lane: "active",
      action: null,
    });
    expect(billingBand(sub({ days_remaining: PAY_AHEAD_DAYS }), null, overview())).toMatchObject({
      lane: "endingSoon",
      action: "pay",
    });
    expect(billingBand(sub({ days_remaining: 0 }), null, overview()).lane).toBe("endingSoon");
  });

  it("with the next period paid, nothing is ending and nothing is asked", () => {
    const next = { plan: "Premium", plan_public_id: "pln_premium_m", billing_cycle: "monthly" as const, start_date: "2026-11-09", end_date: "2026-12-08" };
    expect(billingBand(sub({ days_remaining: 2, next_period: next }), null, overview())).toMatchObject({
      lane: "active",
      action: null,
      next,
    });
  });

  it("offers to pay once the plan has ended: its grace day, then after it", () => {
    expect(billingBand(sub({ subscription_status: "GRACE", days_remaining: 0, active_row_calendar_status: "GRACE" }), null, overview()))
      .toMatchObject({ lane: "grace", daysLeft: 0, action: "pay" });
    expect(billingBand(sub({ subscription_status: "EXPIRED", days_remaining: 0, active_row_calendar_status: "EXPIRED" }), null, overview()))
      .toMatchObject({ lane: "expired", daysLeft: null, action: "pay" });
  });

  it("a trial, or no plan at all, chooses one", () => {
    expect(billingBand(sub({ is_trial: true, days_remaining: 9 }), null, overview())).toMatchObject({
      lane: "trial",
      daysLeft: 9,
      action: "choose",
    });
    expect(billingBand(sub({ subscription_status: "NONE", plan: null, plan_public_id: null }), null, overview({ period: null })))
      .toMatchObject({ lane: "none", daysLeft: null, periodDays: null, nextDue: null, action: "choose" });
  });

  it("a payment being checked names it, and keeps the running period's days", () => {
    const checking = payment({ public_id: "pay_2", status: "pending", transaction_id: "7XY55PLM0A" });
    const band = billingBand(
      sub({ subscription_status: "PENDING_REVIEW" }),
      "PENDING_REVIEW",
      overview({ payments: [checking, payment()] }),
    );
    expect(band).toMatchObject({ lane: "checking", daysLeft: 18, action: null });
    expect(band.payment?.transaction_id).toBe("7XY55PLM0A");
  });

  it("a first payment being checked has no days to count yet", () => {
    const band = billingBand(
      sub({ subscription_status: "PENDING_REVIEW", days_remaining: 0, active_row_calendar_status: null }),
      "PENDING_REVIEW",
      overview({ payments: [payment({ status: "pending" })] }),
    );
    expect(band).toMatchObject({ lane: "checking", daysLeft: null });
  });

  it("a payment not found names it and offers to pay again", () => {
    const refused = payment({ public_id: "pay_3", status: "failed", transaction_id: "8AB0QQ11MN" });
    const band = billingBand(sub({ subscription_status: "REJECTED" }), "REJECTED", overview({ payments: [refused, payment()] }));
    expect(band).toMatchObject({ lane: "notFound", action: "pay" });
    expect(band.payment?.transaction_id).toBe("8AB0QQ11MN");
  });
});
