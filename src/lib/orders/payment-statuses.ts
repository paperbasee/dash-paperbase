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

const PAYMENT_PROVIDER_I18N_KEYS: Partial<Record<string, string>> = {
  bkash: "paymentProviderBkash",
  nagad: "paymentProviderNagad",
};

/**
 * Which app the customer sent a prepayment with, so the merchant checks the
 * right one (owner, 2026-09-25). "—" for a payment submitted before it was
 * recorded, or one that did not say.
 */
export function formatPaymentProviderLabel(
  provider: string | null | undefined,
  t?: (key: string) => string,
): string {
  const value = (provider || "").toLowerCase();
  const key = PAYMENT_PROVIDER_I18N_KEYS[value];
  if (!key) return "—";
  return t ? t(key) : value;
}
