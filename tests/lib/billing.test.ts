/**
 * Paperbase billing in the dashboard (lib/billing): how money and days are written, and what
 * Settings > Billing's band says in each state of the plan (owner, 2026-10-09: design B).
 */
import { describe, expect, it } from "vitest";

import { ApiHttpError, ApiTransportError } from "@/lib/api-client";
import {
  billingBand,
  formatBillingAmount,
  formatBillingDay,
  formatBillingMoment,
  formatBillingMonth,
  payRefusal,
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

/** Thursday 21 Oct 2026, 9:54 AM in Dhaka: the band's "now". */
const NOW = Date.parse("2026-10-21T03:54:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(ms).toISOString();

function overview(fields: Partial<BillingOverview> = {}): BillingOverview {
  return {
    // 30 days to the minute: approved 9 Oct at 9:54 AM, ending 8 Nov at 9:54 AM (Dhaka).
    period: { starts_at: "2026-10-09T03:54:00Z", ends_at: "2026-11-08T03:54:00Z" },
    fraud_checks: { included: true, today: 37, per_day: 100 },
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
    starts_at: "2026-10-09T03:54:00Z",
    ends_at: "2026-11-08T03:54:00Z",
    is_trial: false,
    active_row_calendar_status: "ACTIVE",
    next_period: null,
    ...fields,
  };
}

describe("money, days and moments", () => {
  it("are taka, a short date, and a date with its time in Dhaka, in the reader's digits", () => {
    expect(formatBillingAmount(1800, "en")).toBe("৳1,800");
    expect(formatBillingAmount("21600.00", "en")).toBe("৳21,600");
    expect(formatBillingAmount(1800, "bn")).toBe("৳১,৮০০");
    expect(formatBillingDay("2026-11-08", "en")).toBe("8 Nov 2026");
    expect(formatBillingDay("2026-11-08T00:00:00Z", "en")).toBe("8 Nov 2026");
    expect(formatBillingDay("2026-11-08", "bn")).toMatch(/^৮/);
    // A time is its day in Bangladesh: 20:00 UTC on 8 Nov is already 9 Nov there.
    expect(formatBillingDay("2026-11-08T20:00:00Z", "en")).toBe("9 Nov 2026");
    expect(formatBillingMonth("2026-07-25T08:00:00Z", "en")).toBe("Jul 2026");
    expect(formatBillingMoment("2026-12-05T03:54:00Z", "en")).toBe("5 Dec 2026, 9:54 am");
    expect(formatBillingMoment("2026-11-04T18:00:00Z", "en")).toBe("5 Nov 2026, 12:00 am");
    expect(formatBillingMoment("2026-12-05T03:54:00Z", "bn")).toMatch(/^৫ .*৯:৫৪/);
  });
});

describe("the band", () => {
  it("counts the time left of the period in force, and when the next payment is due", () => {
    const band = billingBand(sub(), null, overview(), NOW);
    expect(band).toMatchObject({
      lane: "active",
      daysLeft: 18,
      hoursLeft: 0,
      periodDays: 30,
      nextDue: "2026-11-08T03:54:00Z",
      action: null,
    });
  });

  it("in the plan's last week, offers to pay for the next period: no time is lost", () => {
    expect(PAY_AHEAD_DAYS).toBe(7);
    const ending = (ms: number) => billingBand(sub({ ends_at: at(NOW + ms) }), null, overview(), NOW);
    expect(ending(PAY_AHEAD_DAYS * DAY + 60_000)).toMatchObject({ lane: "active", action: null });
    expect(ending(PAY_AHEAD_DAYS * DAY)).toMatchObject({ lane: "endingSoon", action: "pay" });
    // On its last day it counts the hours.
    expect(ending(5 * HOUR + 30 * 60_000)).toMatchObject({ lane: "endingSoon", daysLeft: 0, hoursLeft: 5 });
  });

  it("with the next period paid, nothing is ending and nothing is asked", () => {
    const next = {
      plan: "Premium",
      plan_public_id: "pln_premium_m",
      billing_cycle: "monthly" as const,
      starts_at: "2026-10-23T03:54:00Z",
      ends_at: "2026-11-22T03:54:00Z",
    };
    expect(billingBand(sub({ ends_at: next.starts_at, next_period: next }), null, overview(), NOW)).toMatchObject({
      lane: "active",
      action: null,
      next,
    });
  });

  it("offers to pay the moment the plan has ended: there is no free day", () => {
    expect(
      billingBand(sub({ subscription_status: "EXPIRED", active_row_calendar_status: "EXPIRED" }), null, overview(), NOW),
    ).toMatchObject({ lane: "expired", daysLeft: null, hoursLeft: null, action: "pay" });
  });

  it("a trial, or no plan at all, chooses one", () => {
    expect(billingBand(sub({ is_trial: true, ends_at: at(NOW + 9 * DAY) }), null, overview(), NOW)).toMatchObject({
      lane: "trial",
      daysLeft: 9,
      action: "choose",
    });
    expect(
      billingBand(sub({ subscription_status: "NONE", plan: null, plan_public_id: null, ends_at: null }), null, overview({ period: null }), NOW),
    ).toMatchObject({ lane: "none", daysLeft: null, periodDays: null, nextDue: null, action: "choose" });
  });

  it("a payment being checked names it, and keeps the running period's time", () => {
    const checking = payment({ public_id: "pay_2", status: "pending", transaction_id: "7XY55PLM0A" });
    const band = billingBand(
      sub({ subscription_status: "PENDING_REVIEW" }),
      "PENDING_REVIEW",
      overview({ payments: [checking, payment()] }),
      NOW,
    );
    expect(band).toMatchObject({ lane: "checking", daysLeft: 18, action: null });
    expect(band.payment?.transaction_id).toBe("7XY55PLM0A");
  });

  it("a first payment being checked has no time to count yet", () => {
    const band = billingBand(
      sub({ subscription_status: "PENDING_REVIEW", active_row_calendar_status: null }),
      "PENDING_REVIEW",
      overview({ payments: [payment({ status: "pending" })] }),
      NOW,
    );
    expect(band).toMatchObject({ lane: "checking", daysLeft: null });
  });

  it("a payment not found names it and offers to pay again", () => {
    const refused = payment({ public_id: "pay_3", status: "failed", transaction_id: "8AB0QQ11MN" });
    const band = billingBand(sub({ subscription_status: "REJECTED" }), "REJECTED", overview({ payments: [refused, payment()] }), NOW);
    expect(band).toMatchObject({ lane: "notFound", action: "pay" });
    expect(band.payment?.transaction_id).toBe("8AB0QQ11MN");
  });
});

describe("payRefusal: why the API would not start a payment", () => {
  const refused = (code: string) => new ApiHttpError("refused", 400, { code, detail: "In English." });

  it("names a payment still being checked", () => {
    expect(payRefusal(refused("payment_waiting"))).toBe("waiting");
  });

  it("names a plan no longer offered", () => {
    expect(payRefusal(refused("plan_unavailable"))).toBe("planGone");
  });

  it("has no words of its own for anything else", () => {
    expect(payRefusal(refused("something_new"))).toBeNull();
    expect(payRefusal(new ApiHttpError("HTTP 500", 500, null))).toBeNull();
    expect(payRefusal(new ApiTransportError("offline"))).toBeNull();
    expect(payRefusal(new Error("boom"))).toBeNull();
  });
});
