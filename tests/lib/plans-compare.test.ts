import { describe, expect, it } from "vitest";

import {
  PAY_AHEAD_DAYS,
  cardAction,
  cardLines,
  chargeOf,
  groupDescription,
  groupPlans,
  groupSaving,
  highlightedGroup,
  nextStart,
  switchOpens,
  planLines,
  planOn,
  PLAN_LINES,
  yearlyOffer,
  yearlySaving,
  type Plan,
} from "@/lib/plans-compare";

const plan = (name: string, cycle: "monthly" | "yearly", price: string, features: Plan["features"]): Plan => ({
  public_id: `${name}-${cycle}`,
  name,
  price,
  billing_cycle: cycle,
  features,
  is_default: false,
});

// The plans as the API has them (billing/plans/, ordered by price).
const essential = { limits: {}, features: { order_email_notifications: false } };
const premium = {
  limits: { fraud_checks_per_day: 100 },
  features: {
    themes: true,
    fraud_check: true,
    premium_sections: true,
    advanced_analytics: true,
    order_email_notifications: true,
  },
};
const PLANS = [
  plan("Essential", "yearly", "1000.00", essential),
  plan("Essential", "monthly", "1200.00", essential),
  plan("Premium", "yearly", "1500.00", premium),
  plan("Premium", "monthly", "1800.00", premium),
];

describe("groupPlans", () => {
  it("shows each plan once with both cycles, the cheapest first", () => {
    const groups = groupPlans([...PLANS].reverse());
    expect(groups.map((group) => group.name)).toEqual(["Essential", "Premium"]);
    expect(groups[0].monthly?.price).toBe("1200.00");
    expect(groups[0].yearly?.price).toBe("1000.00");
  });

  it("falls back to the cycle a plan has", () => {
    const [only] = groupPlans([plan("Solo", "monthly", "500.00", {})]);
    expect(planOn(only, "yearly")?.billing_cycle).toBe("monthly");
  });
});

describe("yearlySaving", () => {
  it("works the saving out from the prices", () => {
    expect(yearlySaving(groupPlans(PLANS))).toEqual({ low: 17, high: 17 });
  });

  it("is nothing without yearly prices", () => {
    expect(yearlySaving(groupPlans(PLANS.filter((p) => p.billing_cycle === "monthly")))).toBeNull();
  });
});

describe("what each card lists (owner, 2026-10-03: Shopify's way)", () => {
  const groups = groupPlans(PLANS);
  const ids = (index: number, cycle: "monthly" | "yearly" = "monthly") => cardLines(groups, index, cycle);

  it("the first plan says what you get: every plan's lines (unlimited products), what it switches on", () => {
    expect(ids(0)).toEqual({
      plus: null,
      lines: [
        { id: "shop" },
        { id: "orders" },
        { id: "unlimitedProducts" },
        { id: "steadfast" },
        { id: "team" },
        { id: "extras" },
      ],
    });
  });

  it("each plan after says only what it adds to the one before", () => {
    expect(ids(1, "yearly")).toEqual({
      plus: "Essential",
      lines: [
        { id: "analytics" },
        { id: "fraudCheckPerDay", count: 100 },
        { id: "orderEmails" },
        { id: "premiumSections" },
      ],
    });
  });

  it("analytics is Premium's whole page, and neither the retired Overview-and-Sales switch nor themes is offered", () => {
    expect(ids(0).lines.map((line) => line.id)).not.toContain("analytics");
    const keys = PLAN_LINES.map((line) => line.key);
    expect(keys).not.toContain("basic_analytics");
    expect(keys).not.toContain("themes");
  });

  it("fraud checks say how many a day when the admin set it; more a day is an addition; nothing new lists nothing", () => {
    const few = { limits: { fraud_checks_per_day: 50 }, features: { fraud_check: true } };
    const many = { limits: { fraud_checks_per_day: 200 }, features: { fraud_check: true } };
    const unset = { features: { fraud_check: true } };
    const pair = groupPlans([plan("Small", "monthly", "100.00", few), plan("Big", "monthly", "200.00", many)]);
    expect(cardLines(pair, 1, "monthly").lines).toEqual([{ id: "fraudCheckPerDay", count: 200 }]);
    const same = groupPlans([plan("A", "monthly", "100.00", few), plan("B", "monthly", "200.00", few)]);
    expect(cardLines(same, 1, "monthly").lines).toEqual([]);
    const alone = groupPlans([plan("Only", "monthly", "100.00", unset)]);
    expect(cardLines(alone, 0, "monthly").lines.at(-1)).toEqual({ id: "fraudCheck" });
  });
});

describe("the cards (owner, 2026-10-03)", () => {
  it("the dark card is the plan marked Recommended, else the dearest", () => {
    const groups = groupPlans(PLANS);
    expect(highlightedGroup(groups)?.name).toBe("Premium");
    const marked = groupPlans(PLANS.map((p) => (p.name === "Essential" && p.billing_cycle === "yearly" ? { ...p, is_default: true } : p)));
    expect(highlightedGroup(marked)?.name).toBe("Essential");
    expect(highlightedGroup([])).toBeNull();
  });

  it("a plan's line comes from either of its rows, in the page's language", () => {
    const [essential] = groupPlans(
      PLANS.map((p) => (p.name === "Essential" && p.billing_cycle === "monthly" ? { ...p, description_en: "For a new shop.", description_bn: "নতুন দোকানের জন্য।" } : p)),
    );
    expect(groupDescription(essential, "en")).toBe("For a new shop.");
    expect(groupDescription(essential, "bn")).toBe("নতুন দোকানের জন্য।");
    const [plain] = groupPlans(PLANS.map((p) => (p.name === "Essential" ? { ...p, description_en: "English only." } : p)));
    expect(groupDescription(plain, "bn")).toBe("English only.");
    expect(groupDescription(groupPlans(PLANS)[1], "en")).toBe("");
  });

  it("each plan's own yearly saving", () => {
    const [essential, premium] = groupPlans(PLANS);
    expect(groupSaving(essential)).toBe(17);
    expect(groupSaving(premium)).toBe(17);
    expect(groupSaving(groupPlans([plan("Solo", "monthly", "500.00", {})])[0])).toBeNull();
  });
});

describe("a card's button (owner, 2026-10-03; paying early, 2026-10-09; to the minute, 2026-11-05)", () => {
  const [essential, premium] = groupPlans(PLANS);
  const DAY = 86_400_000;
  const on = {
    id: essential.monthly!.public_id,
    name: "Essential",
    trial: false,
    endsAt: "2026-11-01T03:54:00Z",
    msLeft: 20 * DAY,
    paidUntil: null,
  };

  it("none while the shop's own paid plan has more than a week to run, on either cycle", () => {
    expect(cardAction(on, essential.monthly!)).toBeNull();
    expect(cardAction(on, essential.yearly!)).toBeNull();
  });

  it("in its last week: renew it, its other cycle, or another plan -- each starting when it ends", () => {
    const lastWeek = { ...on, msLeft: PAY_AHEAD_DAYS * DAY };
    expect(cardAction(lastWeek, essential.monthly!)).toBe("renew");
    expect(cardAction(lastWeek, essential.yearly!)).toBe("switchToYearly");
    expect(cardAction(lastWeek, premium.monthly!)).toBe("switchTo");
    expect(cardAction({ ...on, msLeft: PAY_AHEAD_DAYS * DAY + 60_000 }, essential.monthly!)).toBeNull();
    expect(cardAction(on, premium.monthly!)).toBeNull();
  });

  it("before its last week, says when switching opens: a week before the exact end", () => {
    expect(switchOpens(on)).toBe("2026-10-25T03:54:00.000Z");
    expect(switchOpens({ ...on, paidUntil: "2026-12-01T03:54:00Z" })).toBeNull();
    expect(switchOpens({ ...on, trial: true })).toBeNull();
    expect(switchOpens(null)).toBeNull();
  });

  it("none once the next period is paid", () => {
    expect(cardAction({ ...on, msLeft: 2 * DAY, paidUntil: "2026-12-01T03:54:00Z" }, essential.monthly!)).toBeNull();
  });

  it("a new period starts the moment the current one ends", () => {
    expect(nextStart(on)).toBe("2026-11-01T03:54:00Z");
    expect(nextStart(null)).toBeNull();
  });

  it("select on a trial's plan, on every other plan, and with no plan", () => {
    expect(cardAction({ ...on, trial: true }, essential.monthly!)).toBe("select");
    expect(cardAction(null, premium.monthly!)).toBe("select");
  });
});

describe("one plan on its own (Settings > Billing, owner 2026-10-09)", () => {
  const [, essentialMonthly, premiumYearly, premiumMonthly] = PLANS;

  it("lists what it gives: unlimited products, then what it switches on", () => {
    expect(planLines(premiumMonthly)).toEqual([
      { id: "unlimitedProducts" },
      { id: "analytics" },
      { id: "fraudCheckPerDay", count: 100 },
      { id: "orderEmails" },
      { id: "premiumSections" },
    ]);
    expect(planLines(essentialMonthly)).toEqual([{ id: "unlimitedProducts" }]);
    expect(planLines(plan("Open", "monthly", "0", {}))).toEqual([{ id: "unlimitedProducts" }]);
  });

  it("charges a month, or twelve months at once on yearly", () => {
    expect(chargeOf(premiumMonthly)).toBe(1800);
    expect(chargeOf(premiumYearly)).toBe(18000);
  });

  it("offers its yearly row to a monthly plan when that saves money", () => {
    expect(yearlyOffer(PLANS, premiumMonthly)).toEqual({ plan: premiumYearly, charge: 18000, saving: 3600 });
    expect(yearlyOffer(PLANS, premiumYearly)).toBeNull();
    expect(yearlyOffer([premiumMonthly], premiumMonthly)).toBeNull();
    expect(yearlyOffer([plan("Premium", "yearly", "1900.00", premium), premiumMonthly], premiumMonthly)).toBeNull();
  });
});
