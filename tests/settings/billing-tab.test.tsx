/**
 * Settings > Billing (owner, 2026-10-09: design B): the band in every state of the plan, the tiles,
 * the payments and what the plan gives -- drawn in both languages, with a missing word failing.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/navigation/DeferredNavLink", () => ({
  DeferredNavLink: ({ href, onNavigate: _onNavigate, ...props }: Record<string, unknown>) => (
    <a href={String(href)} {...(props as object)} />
  ),
}));

import {
  BillingBand,
  BillingTiles,
  PaymentTimeline,
  PlanIncludes,
  YearlyCard,
} from "@/app/[locale]/(dashboard)/settings/sections/billing/BillingParts";
import { billingBand, type BillingOverview, type BillingPayment } from "@/lib/billing";
import type { Plan } from "@/lib/plans-compare";
import type { MeSubscription } from "@/lib/subscription-access";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const strict = (error: unknown) => {
  throw error;
};

function draw(node: React.ReactNode, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka" onError={strict}>
      {node}
    </NextIntlClientProvider>,
  );
}

const premium: Plan = {
  public_id: "pln_premium_m",
  name: "Premium",
  price: "1800.00",
  billing_cycle: "monthly",
  features: {
    limits: { fraud_checks_per_day: 100 },
    features: { advanced_analytics: true, fraud_check: true, order_email_notifications: true, premium_sections: true },
  },
  is_default: true,
};

function payment(fields: Partial<BillingPayment> = {}): BillingPayment {
  return {
    public_id: "pay_1",
    created_at: "2026-10-09T04:00:00Z",
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

const overview: BillingOverview = {
  // 30 days to the minute: 9 Oct at 9:54 AM to 8 Nov at 9:54 AM (Dhaka).
  period: { starts_at: "2026-10-09T03:54:00Z", ends_at: "2026-11-08T03:54:00Z" },
  fraud_checks: { included: true, today: 37, per_day: 100 },
  payments: [payment()],
  paid: { total: "1800.00", count: 1, since: "2026-10-09T04:00:00Z" },
};

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

/** The period the overview holds is the one /auth/me/ dates: the same end. */
function periodOf(subscription: MeSubscription): BillingOverview["period"] {
  return subscription.starts_at && subscription.ends_at
    ? { starts_at: subscription.starts_at, ends_at: subscription.ends_at }
    : null;
}

function band(subscription: MeSubscription, latest: "REJECTED" | "PENDING_REVIEW" | null = null, data?: BillingOverview, locale: "en" | "bn" = "en", canAct = true) {
  const shown = data ?? { ...overview, period: periodOf(subscription) };
  return draw(
    <BillingBand
      band={billingBand(subscription, latest, shown, NOW)}
      plan={premium}
      planName={subscription.plan}
      endsAt={subscription.ends_at}
      canAct={canAct}
      paying={false}
      payError={null}
      onPay={() => {}}
    />,
    locale,
  );
}

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the band", () => {
  it("while the plan runs: the days left, until when to the minute, the next payment, and no pay button", () => {
    const html = band(sub());
    expect(text(html)).toContain("Premium · Monthly Active");
    expect(text(html)).toContain("18 days left");
    expect(text(html)).toContain("Paid until 8 Nov 2026, 9:54 am.");
    expect(text(html)).toContain("Next payment: ৳1,800 on 8 Nov 2026, 9:54 am.");
    expect(html).toContain('aria-label="18 of 30 days left"');
    expect(html).not.toContain("Pay ৳1,800 now");
    // Nothing to do: the tab's own "Compare plans" is the way to the plans.
    expect(html).not.toContain('href="/plans"');
  });

  it("in its last week, offers to pay for the next period, which starts the moment this one ends", () => {
    const html = text(band(sub({ ends_at: at(NOW + 6 * DAY) })));
    expect(html).toContain("Ends in 6 days");
    expect(html).toContain(
      "Pay now: approved before 27 Oct 2026, 9:54 am, the next period starts exactly then, so no time is lost.",
    );
    expect(html).toContain("Pay ৳1,800 now");
    expect(html).toContain("Starts 27 Oct 2026, 9:54 am");
  });

  it("on its last day, counts the hours", () => {
    const html = text(band(sub({ ends_at: at(NOW + 5 * HOUR + 10 * 60_000) })));
    expect(html).toContain("Ends in 5 hours");
    expect(html).toContain("5 hours left");
    expect(text(band(sub({ ends_at: at(NOW + 20 * 60_000) })))).toContain("Ends within the hour");
  });

  it("with the next period paid, says so and asks nothing", () => {
    const next = {
      plan: "Premium",
      plan_public_id: "pln_premium_y",
      billing_cycle: "yearly" as const,
      starts_at: "2026-10-23T03:54:00Z",
      ends_at: "2027-10-23T03:54:00Z",
    };
    const html = text(band(sub({ ends_at: next.starts_at, next_period: next })));
    expect(html).toContain("Active");
    expect(html).toContain("Paid ahead: Premium · Yearly, 23 Oct 2026, 9:54 am to 23 Oct 2027, 9:54 am.");
    expect(html).not.toContain("Pay ৳1,800 now");
  });

  it("the moment it has ended, offers to pay and says the shop is closed", () => {
    const ended = text(
      band(sub({ subscription_status: "EXPIRED", active_row_calendar_status: "EXPIRED", ends_at: "2026-10-20T03:54:00Z" })),
    );
    expect(ended).toContain("Premium ended on 20 Oct 2026, 9:54 am.");
    expect(ended).toContain("closed to shoppers until you pay");
    expect(ended).toContain("Pay ৳1,800 now");
  });

  it("names the payment being checked, and the one not found", () => {
    const checking = payment({ public_id: "pay_2", status: "pending", transaction_id: "7XY55PLM0A" });
    const html = text(band(sub({ subscription_status: "PENDING_REVIEW" }), "PENDING_REVIEW", { ...overview, payments: [checking] }));
    expect(html).toContain("We are checking your payment of ৳1,800.");
    expect(html).toContain("Transaction ID 7XY55PLM0A");
    const refused = payment({ public_id: "pay_3", status: "failed", transaction_id: "8AB0QQ11MN" });
    const notFound = text(band(sub({ subscription_status: "REJECTED" }), "REJECTED", { ...overview, payments: [refused] }));
    expect(notFound).toContain("We could not confirm transaction ID 8AB0QQ11MN.");
    expect(notFound).toContain("Pay again");
  });

  it("a trial and no plan at all choose one", () => {
    expect(text(band(sub({ is_trial: true, ends_at: at(NOW + 9 * DAY) })))).toContain("Free trial");
    const none = text(band(sub({ subscription_status: "NONE", plan: null, plan_public_id: null, starts_at: null, ends_at: null })));
    expect(none).toContain("No plan yet");
    expect(none).toContain("Choose a plan");
  });

  it("Paperbase support reads it without a button", () => {
    const html = band(sub({ subscription_status: "EXPIRED", active_row_calendar_status: "EXPIRED" }), null, undefined, "en", false);
    expect(html).not.toContain("Pay ৳1,800 now");
    expect(html).not.toContain('href="/plans"');
  });

  it("speaks Bangla, in Bangla digits, in every state", () => {
    const next = { plan: "Premium", plan_public_id: "p", billing_cycle: "monthly" as const, starts_at: "2026-10-22T03:54:00Z", ends_at: "2026-11-21T03:54:00Z" };
    const states: [MeSubscription, "REJECTED" | "PENDING_REVIEW" | null][] = [
      [sub(), null],
      [sub({ ends_at: at(NOW + DAY + HOUR) }), null],
      [sub({ ends_at: at(NOW + 5 * HOUR) }), null],
      [sub({ ends_at: next.starts_at, next_period: next }), null],
      [sub({ is_trial: true }), null],
      [sub({ subscription_status: "EXPIRED", active_row_calendar_status: "EXPIRED" }), null],
      [sub({ subscription_status: "PENDING_REVIEW" }), "PENDING_REVIEW"],
      [sub({ subscription_status: "REJECTED" }), "REJECTED"],
      [sub({ subscription_status: "NONE", plan: null }), null],
    ];
    for (const [subscription, latest] of states) {
      const data = { ...overview, period: periodOf(subscription), payments: [payment({ status: "pending" }), payment({ status: "failed" })] };
      const html = band(subscription, latest, data, "bn");
      // Two English words in a row on screen would be a sentence left in English (names stand alone).
      expect(text(html)).not.toMatch(/[A-Za-z]{4,} [A-Za-z]{4,}/);
    }
    expect(text(band(sub(), null, undefined, "bn"))).toContain("১৮");
  });
});

describe("the tiles", () => {
  it("products against the cap, the price, and what has been paid since when", () => {
    const yearly = { ...premium, public_id: "pln_premium_y", price: "1500.00", billing_cycle: "yearly" as const };
    const html = text(draw(<BillingTiles overview={overview} plan={premium} yearly={yearly} />));
    expect(html).toContain("Fraud checks today");
    expect(html).toContain("37 of 100");
    expect(html).toContain("৳1,800 a month");
    expect(html).toContain("৳1,500 a month if paid yearly");
    expect(html).toContain("৳1,800");
    expect(html).toContain("1 payment since Oct 2026");
  });

  it("no daily number set, and nothing paid yet", () => {
    const html = text(
      draw(
        <BillingTiles
          overview={{ ...overview, fraud_checks: { included: true, today: 3, per_day: null }, paid: { total: "0.00", count: 0, since: null } }}
          plan={null}
          yearly={null}
        />,
      ),
    );
    expect(html).toContain("Fraud checks today 3");
    expect(html).not.toContain(" of ");
    expect(html).toContain("No payments yet");
  });

  it("a plan without fraud checks says they are Premium's", () => {
    const html = text(
      draw(<BillingTiles overview={{ ...overview, fraud_checks: { included: false, today: 0, per_day: null } }} plan={null} yearly={null} />),
    );
    expect(html).toContain("Part of Premium");
  });
});

describe("the payments", () => {
  it("newest first, with the date, the transaction ID and how it went", () => {
    const html = text(
      draw(
        <PaymentTimeline
          payments={[
            payment({ public_id: "a", status: "pending", transaction_id: "7XY55PLM0A" }),
            payment({ public_id: "b", status: "failed", transaction_id: "8AB0QQ11MN", provider: "bkash" }),
            payment({ public_id: "c" }),
            payment({ public_id: "d", kind: "trial", amount: "0.00", transaction_id: null }),
            payment({ public_id: "e", kind: "manual", transaction_id: null }),
            payment({ public_id: "f", provider: "", transaction_id: "NOPROVIDER1" }),
          ]}
        />,
      ),
    );
    expect(html).toContain("Premium · Monthly 9 Oct 2026 · ID 7XY55PLM0A ৳1,800 Being checked");
    expect(html).toContain("9 Oct 2026 · bKash · ID 8AB0QQ11MN ৳1,800 Not found");
    expect(html).toContain("ID 9KJ4XQ27PA ৳1,800 Paid");
    expect(html).toContain("Free trial 9 Oct 2026 ৳0 Trial");
    expect(html).toContain("Recorded by Paperbase");
    // No provider recorded: no name, and nothing missing.
    expect(html).toContain("9 Oct 2026 · ID NOPROVIDER1 ৳1,800 Paid");
  });

  it("none yet", () => {
    expect(text(draw(<PaymentTimeline payments={[]} />))).toContain("No payments yet.");
  });
});

describe("the plan beside them", () => {
  it("what it gives, in the Plans page's words", () => {
    const html = text(draw(<PlanIncludes plan={premium} />));
    expect(html).toContain("Unlimited products");
    expect(html).toContain("Fraud check, up to 100 a day");
    expect(html).toContain("Premium sections in Customize");
  });

  it("what paying yearly saves, said for next time, opening the yearly prices", () => {
    const html = draw(<YearlyCard planName="Premium" charge={18000} saving={3600} />);
    expect(text(html)).toContain("Save ৳3,600 a year");
    expect(text(html)).toContain("Next time, pay ৳18,000 once for twelve months of Premium.");
    expect(html).toContain('href="/plans?cycle=yearly"');
  });
});
