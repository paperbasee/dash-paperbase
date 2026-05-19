"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { checkoutSettingsQueryKey } from "@/lib/query-keys";

export type CustomerFormVariant = "minimal" | "extended";

export type CheckoutSettings = {
  customer_form_variant: CustomerFormVariant;
};

export async function fetchCheckoutSettings(): Promise<CheckoutSettings> {
  const { data } = await api.get<{ customer_form_variant: CustomerFormVariant }>(
    "store/checkout-settings/",
  );
  const v = data.customer_form_variant;
  if (v !== "minimal" && v !== "extended") {
    throw new Error("Invalid response");
  }
  return { customer_form_variant: v };
}

export function useCheckoutSettingsQuery() {
  return useQuery({
    queryKey: checkoutSettingsQueryKey,
    queryFn: fetchCheckoutSettings,
  });
}
