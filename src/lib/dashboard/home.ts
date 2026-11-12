import api from "@/lib/api";

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
    pending: WaitingStep;
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
export const ORDER_QUEUES = ["stuck", "delivered_today", "returned_recently", "risky"] as const;
export type OrderQueue = (typeof ORDER_QUEUES)[number];

export function isOrderQueue(value: string | null | undefined): value is OrderQueue {
  return ORDER_QUEUES.includes(value as OrderQueue);
}
