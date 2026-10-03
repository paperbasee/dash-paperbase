/**
 * The Plans page's cards (owner chose "the Shopify way", 2026-10-02, and its look on 2026-10-03):
 * each plan once with its monthly and yearly prices, and what it gives -- the first what you get,
 * each after it what it adds. What a plan switches is read from the plan itself (billing/plans/:
 * `features.features` and `features.limits`), never from its name, so a plan the admin changes or
 * adds describes itself.
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

/** The shop's own plan, as the Plans page reads it. */
export type CurrentPlan = { id: string; trial: boolean; ended: boolean; endDate: string | null };

/**
 * A card's button (owner, 2026-10-03). The shop's own paid plan in force has none: paying is not by
 * use, and paying again ends the plan that day (api billing activate_subscription), so the days
 * left would be lost. Once it has ended (its grace days) it is renewed, or its other cycle taken.
 * A trial's plan, and every other plan, is chosen like any other.
 */
export function cardAction(
  current: CurrentPlan | null,
  plan: Plan,
): "renew" | "switchToYearly" | "switchToMonthly" | "select" | null {
  if (!current || current.trial) return "select";
  if (!current.ended) return null;
  if (plan.public_id === current.id) return "renew";
  return plan.billing_cycle === "yearly" ? "switchToYearly" : "switchToMonthly";
}

/** A switch in `features.features`, or a number in `features.limits`, that a plan may change. */
export type PlanLine = { id: string; kind: "feature" | "limit"; key: string };

/**
 * What a plan may switch, in the order the cards list it (words: plansPage.lines.<id>). Only what a
 * plan really switches: `themes` is left out, as since the one-theme merge (2026-09-20) it locks
 * nothing a merchant can reach (api billing/feature_gate.py). Analytics is one switch, the whole
 * page (owner, 2026-10-04).
 */
export const PLAN_LINES: PlanLine[] = [
  { id: "products", kind: "limit", key: "max_products" },
  { id: "analytics", kind: "feature", key: "advanced_analytics" },
  { id: "fraudCheck", kind: "feature", key: "fraud_check" },
  { id: "orderEmails", kind: "feature", key: "order_email_notifications" },
  { id: "premiumSections", kind: "feature", key: "premium_sections" },
];

/**
 * What every plan has -- nothing a plan switches, so it is the same text on the first card
 * (owner, 2026-10-03). Steadfast only: the one courier a shop can send to.
 */
export const EVERY_PLAN = ["shop", "orders", "steadfast", "team", "extras"] as const;

/** One line of a card: its words (plansPage.lines.<id>), and a limit's number. */
export type CardLine = { id: string; count?: number };

/** A plan's product cap: a number, or null for none set -- no cap at all (api products/services.py). */
function productCap(plan: Plan | null): number | null {
  const cap = plan?.features?.limits?.max_products;
  return typeof cap === "number" ? cap : null;
}

function productLine(plan: Plan | null): CardLine {
  const cap = productCap(plan);
  return cap === null ? { id: "unlimitedProducts" } : { id: "products", count: cap };
}

/** The switches a plan has on, in PLAN_LINES order. */
function switchedOn(plan: Plan | null): string[] {
  return PLAN_LINES.filter((line) => line.kind === "feature" && plan?.features?.features?.[line.key] === true).map(
    (line) => line.id,
  );
}

/**
 * A card's list, Shopify's way: the first plan says what you get -- what every plan has, its
 * product cap, what it switches on -- and each plan after it says "Everything in <the plan before>,
 * plus:" and only what it adds: a bigger cap, and the switches the one before lacks.
 */
export function cardLines(groups: PlanGroup[], index: number, cycle: BillingCycle): { plus: string | null; lines: CardLine[] } {
  const plan = planOn(groups[index], cycle);
  if (index === 0) {
    const [shop, orders, ...rest] = EVERY_PLAN;
    const features = switchedOn(plan).map((id) => ({ id }));
    return { plus: null, lines: [{ id: shop }, { id: orders }, productLine(plan), ...rest.map((id) => ({ id })), ...features] };
  }
  const before = planOn(groups[index - 1], cycle);
  const [cap, capBefore] = [productCap(plan), productCap(before)];
  const moreProducts = capBefore !== null && (cap === null || cap > capBefore);
  const had = new Set(switchedOn(before));
  const added = switchedOn(plan).filter((id) => !had.has(id));
  return {
    plus: groups[index - 1].name,
    lines: [...(moreProducts ? [productLine(plan)] : []), ...added.map((id) => ({ id }))],
  };
}
