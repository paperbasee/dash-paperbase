"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { shippingZonesQueryKey } from "@/lib/query-keys";
import type { PaginatedResponse, ShippingZone } from "@/types";

export async function fetchShippingZones(): Promise<ShippingZone[]> {
  const { data } = await api.get<PaginatedResponse<ShippingZone> | ShippingZone[]>(
    "admin/shipping-zones/"
  );
  return Array.isArray(data) ? data : (data.results ?? []);
}

export function useShippingZonesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: shippingZonesQueryKey,
    queryFn: fetchShippingZones,
    enabled: options?.enabled ?? true,
  });
}
