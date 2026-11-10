/**
 * Paperbase's billing in the dashboard. Settings > Billing (owner, 2026-10-09: design B) reads the
 * overview the API gives (GET billing/overview/: the period's dates, the fraud checks today against
 * the plan's daily number, the payments made) beside what /auth/me/ says of the plan; the Plans page shares how money
 * and days are written.
 *
 * The band at the top says where the plan stands. Plans run to the minute (2026-11-05): the shop
 * stops at the plan's exact end, with no free day. It offers to pay in the plan's last week
 * (PAY_AHEAD_DAYS), after it ends, and after a payment not found: approved before the end, a period
 * paid early starts the moment the current one ends, so no time is lost (api billing
 * activate_subscription; plans-compare `cardAction` holds the same rule). Once the next period is
 * paid, nothing is ending and nothing is asked.
 */
import api from "@/lib/api";
import { apiErrorCode } from "@/lib/api-client";
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
  /** The period in force, its exact start and end (ISO 8601); none without a plan. */
  period: { starts_at: string; ends_at: string } | null;
  /**
   * The shop's fraud checks that asked the couriers today (Bangladesh's day), against its plan's
   * daily number (Django admin; null when it names none). `included`: the plan has fraud checks.
   */
  fraud_checks: { included: boolean; today: number; per_day: number | null };
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

/** "5 Dec 2026, 9:54 am" in the reader's language and digits: a moment the API gives, in Dhaka time. */
export function formatBillingMoment(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

/** "Jul 2026" in the reader's language, for a time the API gives. */
export function formatBillingMonth(value: string, locale: string): string {
  const [year, month] = dhakaDay(value).split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(year, month - 1, 1),
  );
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export type BandLane = "active" | "endingSoon" | "trial" | "expired" | "checking" | "notFound" | "none";

export interface Band {
  lane: BandLane;
  /** Whole days left of the paid period, for the ring; null when none is running. */
  daysLeft: number | null;
  /** Whole hours left past those days: what a plan on its last day says. */
  hoursLeft: number | null;
  /** The period's length in days. */
  periodDays: number | null;
  /** When the next payment is due: the moment the period ends (ISO 8601). */
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
  expired: "expired",
  inactive: "none",
  trial: "trial",
  none: "active",
};

export function billingBand(
  sub: MeSubscription,
  latestPaymentStatus: LatestPaymentStatus | null,
  overview: BillingOverview,
  now: number = Date.now(),
): Band {
  const next = sub.next_period ?? null;
  // A paid period still running, also under a renewal being checked or refused (/auth/me/).
  const status = sub.subscription_status === "PENDING_REVIEW" || sub.subscription_status === "REJECTED"
    ? sub.active_row_calendar_status
    : sub.subscription_status;
  const left = status === "ACTIVE" && sub.ends_at ? Math.max(0, Date.parse(sub.ends_at) - now) : null;

  let lane = LANES[resolveSubscriptionUIState(sub.subscription_status, latestPaymentStatus, sub.is_trial === true)];
  if (lane === "active" && !next && left !== null && left <= PAY_AHEAD_DAYS * DAY_MS) lane = "endingSoon";

  const period = overview.period;
  const about = lane === "checking" ? "pending" : lane === "notFound" ? "failed" : null;
  return {
    lane,
    daysLeft: left === null ? null : Math.floor(left / DAY_MS),
    hoursLeft: left === null ? null : Math.floor((left % DAY_MS) / HOUR_MS),
    periodDays: period ? Math.round((Date.parse(period.ends_at) - Date.parse(period.starts_at)) / DAY_MS) : null,
    nextDue: period ? period.ends_at : null,
    payment: about ? (overview.payments.find((p) => p.status === about) ?? null) : null,
    action:
      lane === "endingSoon" || lane === "expired" || lane === "notFound"
        ? "pay"
        : lane === "trial" || lane === "none"
          ? "choose"
          : null,
    next,
  };
}

/** Why the API would not start a payment, as a key of the `billingPay` words; null for anything else. */
export type PayRefusal = "waiting" | "planGone";

const PAY_REFUSALS: Record<string, PayRefusal> = {
  payment_waiting: "waiting",
  plan_unavailable: "planGone",
};

export function payRefusal(error: unknown): PayRefusal | null {
  const code = apiErrorCode(error);
  return (code && PAY_REFUSALS[code]) || null;
}
