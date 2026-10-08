/**
 * Paperbase's billing in the dashboard. Settings > Billing (owner, 2026-10-09: design B) reads the
 * overview the API gives (GET billing/overview/: the period's dates, products against the plan's
 * cap, the payments made) beside what /auth/me/ says of the plan; the Plans page shares how money
 * and days are written.
 *
 * The band at the top says where the plan stands. It offers to pay in the plan's last week
 * (PAY_AHEAD_DAYS), on its grace day and after it, and after a payment not found: a period paid
 * early starts the day after the current one ends, so no day is lost (api billing
 * activate_subscription; plans-compare `cardAction` holds the same rule). Once the next period is
 * paid, nothing is ending and nothing is asked.
 */
import api from "@/lib/api";
import { toLocaleDigits } from "@/lib/locale-digits";
import { PAY_AHEAD_DAYS, type BillingCycle, type Plan } from "@/lib/plans-compare";
import type { MeSubscription, NextPeriod } from "@/lib/subscription-access";
import { resolveSubscriptionUIState, type LatestPaymentStatus } from "@/lib/subscription-ui-state";

export type PaymentStatus = "pending" | "success" | "failed" | "refunded";

/** One payment to Paperbase (api billing PaymentHistorySerializer). */
export interface BillingPayment {
  public_id: string;
  created_at: string;
  plan: string | null;
  billing_cycle: BillingCycle | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  /** "manual" for the checkout's own payments: bKash or Nagad is not recorded there (and may be empty). */
  provider: string;
  transaction_id: string | null;
  /** The merchant's payment, a free trial, or a plan Paperbase recorded itself. */
  kind: "payment" | "trial" | "manual";
}

export interface BillingOverview {
  /** The period in force (YYYY-MM-DD, both days included); none without a plan. */
  period: { start_date: string; end_date: string } | null;
  /** Products against the plan's cap; `limit` null when the plan sets none. */
  products: { count: number; limit: number | null };
  /** Newest first. */
  payments: BillingPayment[];
  /** Successful payments of more than nothing: their sum, how many, and the first one's time. */
  paid: { total: string; count: number; since: string | null };
}

export async function fetchBillingOverview(): Promise<BillingOverview> {
  const { data } = await api.get<BillingOverview>("billing/overview/");
  return data;
}

/** Paperbase's plans (GET billing/plans/): the shop's own one's price, cycle and what it gives. */
export async function fetchPlans(): Promise<Plan[]> {
  const { data } = await api.get<Plan[]>("billing/plans/");
  return data;
}

/** "৳1,800": whole taka, grouped in thousands, in the reader's digits. */
export function formatBillingAmount(value: number | string, locale: string): string {
  return `৳${toLocaleDigits(new Intl.NumberFormat("en-US").format(Math.round(Number(value))), locale)}`;
}

/** A day as the API writes it (YYYY-MM-DD), or the day in Bangladesh of a time it gives. */
function dhakaDay(value: string): string {
  if (value.length <= 10) return value;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(value),
  );
}

/** "8 Nov 2026" in the reader's language: a day from the API, or the day of a time in Bangladesh. */
export function formatBillingDay(value: string, locale: string): string {
  const [year, month, day] = dhakaDay(value).split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(year, month - 1, day));
}

/** "Jul 2026" in the reader's language, for a time the API gives. */
export function formatBillingMonth(value: string, locale: string): string {
  const [year, month] = dhakaDay(value).split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(year, month - 1, 1),
  );
}

const DAY_MS = 86_400_000;

function dayNumber(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function dayAfter(ymd: string): string {
  return new Date((dayNumber(ymd) + 1) * DAY_MS).toISOString().slice(0, 10);
}

export type BandLane = "active" | "endingSoon" | "trial" | "grace" | "expired" | "checking" | "notFound" | "none";

export interface Band {
  lane: BandLane;
  /** Days left of the paid period, for the ring; null when none is running. */
  daysLeft: number | null;
  /** The period's length in days. */
  periodDays: number | null;
  /** The next payment's day: the day after the period ends. */
  nextDue: string | null;
  /** The payment the band is about: the one being checked, or the one not found. */
  payment: BillingPayment | null;
  /** Pay for the plan again, choose a plan, or nothing to do. */
  action: "pay" | "choose" | null;
  /** The period already paid to follow this one. */
  next: NextPeriod | null;
}

const LANES: Record<ReturnType<typeof resolveSubscriptionUIState>, BandLane> = {
  rejected: "notFound",
  pending_review: "checking",
  grace: "grace",
  expired: "expired",
  inactive: "none",
  trial: "trial",
  none: "active",
};

export function billingBand(
  sub: MeSubscription,
  latestPaymentStatus: LatestPaymentStatus | null,
  overview: BillingOverview,
): Band {
  const next = sub.next_period ?? null;
  let lane = LANES[resolveSubscriptionUIState(sub.subscription_status, latestPaymentStatus, sub.is_trial === true)];
  if (lane === "active" && !next && sub.days_remaining <= PAY_AHEAD_DAYS) lane = "endingSoon";

  // A paid period still running, also under a renewal being checked or refused (/auth/me/).
  const calendar = sub.subscription_status === "PENDING_REVIEW" || sub.subscription_status === "REJECTED"
    ? sub.active_row_calendar_status
    : sub.subscription_status;
  const daysLeft = calendar === "ACTIVE" ? sub.days_remaining : calendar === "GRACE" ? 0 : null;

  const period = overview.period;
  const about = lane === "checking" ? "pending" : lane === "notFound" ? "failed" : null;
  return {
    lane,
    daysLeft,
    periodDays: period ? dayNumber(period.end_date) - dayNumber(period.start_date) + 1 : null,
    nextDue: period ? dayAfter(period.end_date) : null,
    payment: about ? (overview.payments.find((p) => p.status === about) ?? null) : null,
    action:
      lane === "endingSoon" || lane === "grace" || lane === "expired" || lane === "notFound"
        ? "pay"
        : lane === "trial" || lane === "none"
          ? "choose"
          : null,
    next,
  };
}
