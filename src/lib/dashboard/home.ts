import api from "@/lib/api";
import type { DashboardAnalyticsSummary } from "@/lib/basicAnalyticsService";

/** One step an order waits at, and since when its oldest has waited (null when empty). */
export interface WaitingStep {
  count: number;
  oldest_at: string | null;
}

/**
 * The home page's "right now" numbers (GET admin/home/). A part is null when the member may
 * not open its list: the page hides it rather than link to a page that would refuse them.
 */
export interface HomeNumbers {
  flow: {
    /** `over_day`: placed more than a day ago, the list `?queue=pending_over_day` opens. */
    pending: WaitingStep & { over_day: number };
    payment_pending: WaitingStep;
    to_send: WaitingStep;
    in_transit: { count: number; stuck: number };
    delivered_today: { count: number };
    /** Returned in the last seven days. */
    returned_recently: { count: number };
  } | null;
  attention: {
    risky: number | null;
    incomplete_checkouts: number | null;
    messages: number | null;
    reviews: number | null;
    out_of_stock: number | null;
    low_stock: number | null;
  };
}

/**
 * The money Steadfast holds for the shop (GET admin/courier-balance/, owner and Admins).
 * `not_connected` hides the card; `unauthorized` means Steadfast refused the saved keys.
 */
export type CourierBalance =
  | { state: "ok"; amount: string; checked_at: string }
  | { state: "not_connected" | "unauthorized" | "unavailable" };

export async function fetchHomeNumbers(): Promise<HomeNumbers> {
  const { data } = await api.get<HomeNumbers>("admin/home/");
  return data;
}

export async function fetchCourierBalance(): Promise<CourierBalance> {
  const { data } = await api.get<CourierBalance>("admin/courier-balance/");
  return data;
}

/**
 * The orders list's named views the home page opens (`/orders?queue=...`), each the same
 * query as its home count (API orders/queues.py).
 */
export const ORDER_QUEUES = ["pending_over_day", "stuck", "delivered_today", "returned_recently", "risky"] as const;
export type OrderQueue = (typeof ORDER_QUEUES)[number];

export function isOrderQueue(value: string | null | undefined): value is OrderQueue {
  return ORDER_QUEUES.includes(value as OrderQueue);
}

/** Cancellations up by at least this share, and by at least two orders, make an insight. */
const CANCELLED_RISE_SHARE = 0.2;
const CANCELLED_RISE_MIN = 2;

export type HomeInsight =
  | { kind: "late"; count: number }
  | { kind: "stuck"; count: number }
  | { kind: "cancelled"; percent: number; now: number; before: number };

/**
 * What the home page says in words below its numbers (owner's pick, 2026-11-26): each only
 * while it is true, from numbers the page already has, most urgent first. A member who may not
 * open orders (no `flow`) is told nothing.
 */
export function homeInsights(
  flow: HomeNumbers["flow"] | undefined,
  summary: DashboardAnalyticsSummary | null,
  previous: DashboardAnalyticsSummary | null
): HomeInsight[] {
  if (!flow) return [];
  const insights: HomeInsight[] = [];
  if (flow.pending.over_day > 0) insights.push({ kind: "late", count: flow.pending.over_day });
  if (flow.in_transit.stuck > 0) insights.push({ kind: "stuck", count: flow.in_transit.stuck });
  if (summary && previous && previous.cancelled > 0) {
    const rise = summary.cancelled - previous.cancelled;
    if (rise >= CANCELLED_RISE_MIN && rise / previous.cancelled >= CANCELLED_RISE_SHARE) {
      insights.push({
        kind: "cancelled",
        percent: Math.round((rise / previous.cancelled) * 100),
        now: summary.cancelled,
        before: previous.cancelled,
      });
    }
  }
  return insights;
}
