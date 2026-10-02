import { describe, expect, it } from "vitest";

import { cellOf, comparison, COMPARE_GROUPS, groupPlans, planOn, yearlySaving, type Plan } from "@/lib/plans-compare";

const plan = (name: string, cycle: "monthly" | "yearly", price: string, features: Plan["features"]): Plan => ({
  public_id: `${name}-${cycle}`,
  name,
  price,
  billing_cycle: cycle,
  features,
  is_default: false,
});

// The plans as the API has them (billing/plans/, ordered by price).
const essential = { limits: { max_products: 100 }, features: { basic_analytics: true, order_email_notifications: false } };
const premium = {
  limits: { max_products: 500 },
  features: {
    themes: true,
    fraud_check: true,
    basic_analytics: true,
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

describe("comparison", () => {
  const groups = groupPlans(PLANS);
  const shown = groups.map((group) => planOn(group, "monthly"));

  it("reads each answer from the plan, not its name", () => {
    const row = (id: string) => COMPARE_GROUPS.flatMap((g) => g.rows).find((r) => r.id === id)!;
    expect(shown.map((p) => cellOf(p, row("overviewSales")))).toEqual([true, true]);
    expect(shown.map((p) => cellOf(p, row("fraudCheck")))).toEqual([false, true]);
    expect(shown.map((p) => cellOf(p, row("products")))).toEqual([100, 500]);
  });

  it("never offers the theme switch, which locks nothing any more", () => {
    const keys = COMPARE_GROUPS.flatMap((g) => g.rows).map((r) => r.key);
    expect(keys).not.toContain("themes");
  });

  it("drops a row no plan has, and a group left empty", () => {
    const bare = comparison([plan("Bare", "monthly", "1.00", { features: { basic_analytics: true } })]);
    expect(bare).toEqual([{ id: "analytics", rows: [COMPARE_GROUPS[0].rows[0]] }]);
  });

  it("keeps every row the real plans have", () => {
    expect(comparison(shown).flatMap((g) => g.rows).map((r) => r.id)).toEqual([
      "overviewSales",
      "otherSections",
      "live",
      "fraudCheck",
      "orderEmails",
      "products",
      "premiumSections",
    ]);
  });
});
