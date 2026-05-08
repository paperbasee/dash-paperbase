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

const DELIVERY_STATUS_FALLBACK_LABELS: Record<string, string> = {
  not_dispatched: "Not Dispatched",
  in_transit: "In Transit",
  delivered: "Delivered",
  partial_delivered: "Partial Delivered",
  cancelled: "Delivery Failed",
  unknown: "Unknown",
};

export function formatOrderDeliveryStatusLabel(
  status: string | null | undefined,
  t?: (key: string) => string,
): string {
  const value = (status || "").toLowerCase();
  if (!value) return "—";
  const key = DELIVERY_STATUS_I18N_KEYS[value];
  if (t && key) return t(key);
  return DELIVERY_STATUS_FALLBACK_LABELS[value] || value.replace(/_/g, " ");
}
