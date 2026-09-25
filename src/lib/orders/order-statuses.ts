export const ORDER_STATUS_OPTIONS = [
  "pending",
  "payment_pending",
  "confirmed",
  "cancelled",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_OPTIONS)[number];

const STATUS_I18N_KEYS: Partial<Record<string, string>> = {
  pending: "orderStatusPending",
  payment_pending: "orderStatusPaymentPending",
  payment_submitted: "orderStatusPaymentSubmitted",
  confirmed: "orderStatusConfirmed",
  cancelled: "orderStatusCancelled",
};

type OrderStatusFacts = { status: string; payment_status?: string | null };

/**
 * What an order's status READS as, which is not always what is stored.
 *
 * A prepaid order stays `payment_pending` until the merchant verifies it, but
 * once the shopper has sent the bKash or Nagad reference they have done their
 * part: "Payment pending" hid that the order is now waiting on the MERCHANT
 * (owner, 2026-09-25: "payment pending only shows when the user places the
 * order ... after [the transaction id] it will show payment submitted, then
 * when I verify it will say confirmed").
 *
 * `payment_submitted` is a reading, not a status: nothing is ever saved as it,
 * and the pickers still send `payment_pending`.
 */
export function shownOrderStatus(order: OrderStatusFacts): string {
  if (
    order.status === "payment_pending" &&
    (order.payment_status || "").toLowerCase() === "submitted"
  ) {
    return "payment_submitted";
  }
  return order.status;
}

/** One option of an order's status picker: the order's own option reads as the order does. */
export function orderStatusOptionReading(order: OrderStatusFacts, option: string): string {
  return option === order.status ? shownOrderStatus(order) : option;
}

/** When `t` is passed (e.g. `useTranslations("pages")`), status labels use message keys. */
export function formatOrderStatusLabel(
  status: string,
  t?: (key: string) => string,
): string {
  if (!status) return "—";
  const key = STATUS_I18N_KEYS[status.toLowerCase()];
  if (t && key) return t(key);
  return status.replace(/_/g, " ");
}
