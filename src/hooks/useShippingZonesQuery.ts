"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { shippingZonesQueryKey } from "@/lib/query-keys";
import type { PaginatedResponse, ShippingZone } from "@/types";

export type ShippingZonesHttp = Pick<typeof api, "get">;

/**
 * Every page of admin/shipping-zones/ (24 per page). The order editor's zone select must contain
 * the order's own zone, which may not be on the first page.
 */
export async function fetchShippingZones(http: ShippingZonesHttp = api): Promise<ShippingZone[]> {
  const out: ShippingZone[] = [];
  for (let page = 1; ; page += 1) {
    const { data } = await http.get<PaginatedResponse<ShippingZone> | ShippingZone[]>(
      "admin/shipping-zones/",
      { params: { page: String(page) } },
    );
    if (Array.isArray(data)) return data;
    out.push(...(data.results ?? []));
    if (!data.next) return out;
  }
}

export function useShippingZonesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: shippingZonesQueryKey,
    queryFn: () => fetchShippingZones(),
    enabled: options?.enabled ?? true,
  });
}
