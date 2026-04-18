export const ORDER_PAYMENT_STATUS_OPTIONS = [
  "none",
  "submitted",
  "verified",
  "failed",
] as const;

export type OrderPaymentStatusValue =
  (typeof ORDER_PAYMENT_STATUS_OPTIONS)[number];

const PAYMENT_STATUS_I18N_KEYS: Partial<Record<string, string>> = {
  none: "orderPaymentStatusNone",
  submitted: "orderPaymentStatusSubmitted",
  verified: "orderPaymentStatusVerified",
  failed: "orderPaymentStatusFailed",
};

export function formatOrderPaymentStatusLabel(
  status: string | null | undefined,
  t?: (key: string) => string,
): string {
  const value = (status || "").toLowerCase();
  if (!value) return "—";
  const key = PAYMENT_STATUS_I18N_KEYS[value];
  if (t && key) return t(key);
  return value.replace(/_/g, " ");
}
