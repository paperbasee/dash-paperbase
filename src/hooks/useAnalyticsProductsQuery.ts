"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { analyticsProductsQueryKey } from "@/lib/query-keys";
import type { ProductRow } from "@/app/[locale]/(dashboard)/analytics/_components/types";
import type { AnalyticsQueryOptions } from "@/hooks/useAnalyticsOverviewQuery";

export async function fetchAnalyticsProducts(range: string): Promise<ProductRow[]> {
  const { data: prods } = await api.get<{
    data: {
      product_id: string;
      product_name: string;
      views: number;
      add_to_cart: number;
      purchases: number;
      revenue: string;
      conversion_rate: number;
    }[];
  }>(`admin/analytics/products/?range=${range}`);

  return (Array.isArray(prods.data) ? prods.data : []).map((p) => ({
    product_id: String(p.product_id || ""),
    product_name: String(p.product_name || ""),
    views: Number(p.views || 0),
    add_to_cart: Number(p.add_to_cart || 0),
    purchases: Number(p.purchases || 0),
    revenue: Number(p.revenue || 0),
    conversion_rate: Number(p.conversion_rate || 0),
  }));
}

export function useAnalyticsProductsQuery(
  range: string,
  options?: AnalyticsQueryOptions
) {
  return useQuery({
    queryKey: analyticsProductsQueryKey(range),
    queryFn: () => fetchAnalyticsProducts(range),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}
