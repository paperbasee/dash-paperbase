/**
 * The Plans page's cards and comparison (owner chose "the Shopify way", 2026-10-02): each plan
 * once with its monthly and yearly prices, then every plan's features side by side. What a plan
 * holds is read from the plan itself (billing/plans/: `features.features` switches and
 * `features.limits`), never from its name, so a plan the admin changes or adds compares itself.
 */

export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  public_id: string;
  name: string;
  /** What a month costs on this cycle: a yearly plan's is its monthly equivalent. */
  price: string;
  billing_cycle: BillingCycle;
  features: {
    limits?: Record<string, number>;
    features?: Record<string, boolean>;
  };
  is_default: boolean;
}

export interface PlanGroup {
  name: string;
  monthly: Plan | null;
  yearly: Plan | null;
}

/** One plan per name, with both its cycles, the cheapest first. */
export function groupPlans(plans: Plan[]): PlanGroup[] {
  const byName = new Map<string, PlanGroup>();
  for (const plan of plans) {
    const group = byName.get(plan.name) ?? { name: plan.name, monthly: null, yearly: null };
    group[plan.billing_cycle] = plan;
    byName.set(plan.name, group);
  }
  const monthlyPrice = (group: PlanGroup) => Number((group.monthly ?? group.yearly)?.price ?? 0);
  return [...byName.values()].sort((a, b) => monthlyPrice(a) - monthlyPrice(b));
}

/** The plan a group sells on `cycle`, or its other cycle when it has only one. */
export function planOn(group: PlanGroup, cycle: BillingCycle): Plan | null {
  return group[cycle] ?? group.monthly ?? group.yearly;
}

/** What paying yearly saves, in whole percent, from the lowest to the highest across the plans. */
export function yearlySaving(groups: PlanGroup[]): { low: number; high: number } | null {
  const savings = groups
    .filter((group) => group.monthly && group.yearly && Number(group.monthly.price) > 0)
    .map((group) => Math.round((1 - Number(group.yearly!.price) / Number(group.monthly!.price)) * 100))
    .filter((percent) => percent > 0);
  if (!savings.length) return null;
  return { low: Math.min(...savings), high: Math.max(...savings) };
}

export type CompareRow = {
  /** Its words: plansPage.rows.<id>. */
  id: string;
  /** A switch in `features.features`, or a number in `features.limits`. */
  kind: "feature" | "limit";
  key: string;
};

/**
 * The comparison's rows, in the merchant's words (plansPage.groups / plansPage.rows). Only what a
 * plan really switches: `themes` is left out, as since the one-theme merge (2026-09-20) it locks
 * nothing a merchant can reach (api billing/feature_gate.py).
 */
export const COMPARE_GROUPS: { id: string; rows: CompareRow[] }[] = [
  {
    id: "analytics",
    rows: [
      { id: "overviewSales", kind: "feature", key: "basic_analytics" },
      { id: "otherSections", kind: "feature", key: "advanced_analytics" },
      { id: "live", kind: "feature", key: "advanced_analytics" },
    ],
  },
  {
    id: "orders",
    rows: [
      { id: "fraudCheck", kind: "feature", key: "fraud_check" },
      { id: "orderEmails", kind: "feature", key: "order_email_notifications" },
    ],
  },
  {
    id: "shop",
    rows: [
      { id: "products", kind: "limit", key: "max_products" },
      { id: "premiumSections", kind: "feature", key: "premium_sections" },
    ],
  },
];

/** A plan's answer for a row: included or not, or the limit's number (null: none set). */
export function cellOf(plan: Plan | null, row: CompareRow): boolean | number | null {
  if (row.kind === "limit") {
    const limit = plan?.features?.limits?.[row.key];
    return typeof limit === "number" ? limit : null;
  }
  return plan?.features?.features?.[row.key] === true;
}

/** The groups and rows worth a line: a row no plan has says nothing. */
export function comparison(plans: (Plan | null)[]): { id: string; rows: CompareRow[] }[] {
  return COMPARE_GROUPS.map((group) => ({
    id: group.id,
    rows: group.rows.filter((row) =>
      plans.some((plan) => {
        const cell = cellOf(plan, row);
        return cell === true || typeof cell === "number";
      }),
    ),
  })).filter((group) => group.rows.length > 0);
}
