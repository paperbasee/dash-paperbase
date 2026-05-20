"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { shippingRatesQueryKey } from "@/lib/query-keys";
import type { PaginatedResponse, ShippingRate } from "@/types";

export async function fetchShippingRates(): Promise<ShippingRate[]> {
  const { data } = await api.get<PaginatedResponse<ShippingRate> | ShippingRate[]>(
    "admin/shipping-rates/",
  );
  return Array.isArray(data) ? data : (data.results ?? []);
}

export function useShippingRatesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: shippingRatesQueryKey,
    queryFn: fetchShippingRates,
    enabled: options?.enabled ?? true,
  });
}
