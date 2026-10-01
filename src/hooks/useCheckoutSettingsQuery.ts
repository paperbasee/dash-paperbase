"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { checkoutSettingsQueryKey } from "@/lib/query-keys";

export type CustomerFormVariant = "minimal" | "extended";

/** Longest cooldown the API accepts: one week. Mirrors REPEAT_ORDER_COOLDOWN_MAX_MINUTES. */
export const REPEAT_ORDER_COOLDOWN_MAX_MINUTES = 7 * 24 * 60;

/** How shoppers give their district at checkout: typed, or picked from the 64. */
export type DistrictInput = "text" | "list";

export type CheckoutSettings = {
  customer_form_variant: CustomerFormVariant;
  /** Minutes a phone number must wait between storefront orders. 0 = off. */
  repeat_order_cooldown_minutes: number;
  district_input: DistrictInput;
};

type CheckoutSettingsResponse = {
  customer_form_variant: CustomerFormVariant;
  repeat_order_cooldown_minutes?: unknown;
  district_input?: unknown;
};

/** Tolerates an API build that predates the field, so the section still renders. */
export function parseCheckoutSettings(data: CheckoutSettingsResponse): CheckoutSettings {
  const v = data.customer_form_variant;
  if (v !== "minimal" && v !== "extended") {
    throw new Error("Invalid response");
  }
  const raw = Number(data.repeat_order_cooldown_minutes ?? 0);
  const minutes = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
  return {
    customer_form_variant: v,
    repeat_order_cooldown_minutes: minutes,
    district_input: data.district_input === "list" ? "list" : "text",
  };
}

export async function fetchCheckoutSettings(): Promise<CheckoutSettings> {
  const { data } = await api.get<CheckoutSettingsResponse>("store/checkout-settings/");
  return parseCheckoutSettings(data);
}

/** `enabled`: false while the screen asking is not shown, so a hidden tab reads nothing. */
export function useCheckoutSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: checkoutSettingsQueryKey,
    queryFn: fetchCheckoutSettings,
    enabled,
  });
}
