"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { shippingMethodsQueryKey } from "@/lib/query-keys";
import type { PaginatedResponse, ShippingMethod } from "@/types";

export async function fetchShippingMethods(): Promise<ShippingMethod[]> {
  const { data } = await api.get<PaginatedResponse<ShippingMethod> | ShippingMethod[]>(
    "admin/shipping-methods/"
  );
  return Array.isArray(data) ? data : (data.results ?? []);
}

export function useShippingMethodsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: shippingMethodsQueryKey,
    queryFn: fetchShippingMethods,
    enabled: options?.enabled ?? true,
  });
}
