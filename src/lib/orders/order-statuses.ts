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
  confirmed: "orderStatusConfirmed",
  cancelled: "orderStatusCancelled",
};

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
