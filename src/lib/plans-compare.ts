/**
 * The Plans page's cards (owner chose "the Shopify way", 2026-10-02, and its look on 2026-10-03):
 * each plan once with its monthly and yearly prices and every feature, ticked or crossed. What a plan
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
  /** "Recommended" in Django admin: the page's dark card. */
  is_default: boolean;
  /** The line under the price; a plan's monthly and yearly rows share it (either may hold it). */
  description_en?: string;
  description_bn?: string;
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

/** The plan shown as the dark card: the one marked "Recommended", else the dearest. */
export function highlightedGroup(groups: PlanGroup[]): PlanGroup | null {
  const marked = groups.find((group) => group.monthly?.is_default || group.yearly?.is_default);
  return marked ?? groups[groups.length - 1] ?? null;
}

/** A plan's line in the page's language, from whichever of its rows holds one; English if no Bangla. */
export function groupDescription(group: PlanGroup, locale: string): string {
  const rows = [group.monthly, group.yearly].filter((plan): plan is Plan => plan !== null);
  const pick = (field: "description_en" | "description_bn") =>
    rows.map((plan) => (plan[field] ?? "").trim()).find(Boolean) ?? "";
  return (locale === "bn" && pick("description_bn")) || pick("description_en");
}

/** What paying yearly saves on one plan, in whole percent; null without both prices or a saving. */
export function groupSaving(group: PlanGroup): number | null {
  if (!group.monthly || !group.yearly || Number(group.monthly.price) <= 0) return null;
  const percent = Math.round((1 - Number(group.yearly.price) / Number(group.monthly.price)) * 100);
  return percent > 0 ? percent : null;
}

/** What paying yearly saves, in whole percent, from the lowest to the highest across the plans. */
export function yearlySaving(groups: PlanGroup[]): { low: number; high: number } | null {
  const savings = groups.map(groupSaving).filter((percent): percent is number => percent !== null);
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
 * Every card's lines, in this order and in the merchant's words (plansPage.rows; a limit's number
 * in plansPage.cardRows). Only what a plan really switches: `themes` is left out, as since the one-theme merge (2026-09-20) it locks
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
