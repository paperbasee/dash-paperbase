// Values match `Order.DeliveryStatus` on the backend.
// Note: "cancelled" is intentionally the stored value for "Delivery Failed"
// (see `Order.DeliveryStatus.DELIVERY_FAILED = "cancelled"`); we keep that
// wire value here so the API filter matches, while displaying the friendly
// "Delivery Failed" label users already see in the row badge.
export const ORDER_DELIVERY_STATUS_OPTIONS = [
  "not_dispatched",
  "in_transit",
  "delivered",
  "partial_delivered",
  "cancelled",
  "unknown",
] as const;

export type OrderDeliveryStatusValue =
  (typeof ORDER_DELIVERY_STATUS_OPTIONS)[number];

const DELIVERY_STATUS_I18N_KEYS: Partial<Record<string, string>> = {
  not_dispatched: "orderDeliveryStatusNotDispatched",
  in_transit: "orderDeliveryStatusInTransit",
  delivered: "orderDeliveryStatusDelivered",
  partial_delivered: "orderDeliveryStatusPartialDelivered",
  cancelled: "orderDeliveryStatusFailed",
  unknown: "orderDeliveryStatusUnknown",
};

/** The badge colour of each status; an unknown one looks like `unknown`. */
export const DELIVERY_STATUS_TONE: Record<string, string> = {
  not_dispatched: "bg-muted text-muted-foreground",
  in_transit: "bg-blue-600/10 text-blue-700 dark:text-blue-300",
  delivered: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  partial_delivered: "bg-amber-600/10 text-amber-700 dark:text-amber-300",
  cancelled: "bg-rose-600/10 text-rose-700 dark:text-rose-300",
  unknown: "bg-muted text-muted-foreground",
};

/** A status in the page's words (`pages` messages); a status the API adds later reads as unknown. */
export function formatOrderDeliveryStatusLabel(
  status: string | null | undefined,
  t: (key: string) => string,
): string {
  const value = (status || "").toLowerCase();
  if (!value) return "—";
  return t(DELIVERY_STATUS_I18N_KEYS[value] ?? "orderDeliveryStatusUnknown");
}
