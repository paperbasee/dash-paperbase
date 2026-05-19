"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { analyticsRevenueQueryKey } from "@/lib/query-keys";
import type { RevenueComparison } from "@/app/[locale]/(dashboard)/analytics/_components/types";
import type { AnalyticsQueryOptions } from "@/hooks/useAnalyticsOverviewQuery";

export async function fetchAnalyticsRevenue(range: string): Promise<RevenueComparison> {
  const { data: rev } = await api.get<{
    data: { date: string; revenue: string; orders: number; aov: string }[];
    comparison: { date: string; revenue: string; orders: number; aov: string }[];
    summary: {
      current_revenue: string;
      previous_revenue: string;
      pct_change: number | null;
    };
  }>(`admin/analytics/revenue/?range=${range}`);

  return {
    data: (rev.data ?? []).map((r) => ({
      date: r.date,
      revenue: Number(r.revenue || 0),
      orders: Number(r.orders || 0),
      aov: Number(r.aov || 0),
    })),
    comparison: (rev.comparison ?? []).map((r) => ({
      date: r.date,
      revenue: Number(r.revenue || 0),
      orders: Number(r.orders || 0),
      aov: Number(r.aov || 0),
    })),
    summary: {
      current_revenue: rev.summary?.current_revenue ?? "0",
      previous_revenue: rev.summary?.previous_revenue ?? "0",
      pct_change: rev.summary?.pct_change ?? null,
    },
  };
}

export function useAnalyticsRevenueQuery(
  range: string,
  options?: AnalyticsQueryOptions
) {
  return useQuery({
    queryKey: analyticsRevenueQueryKey(range),
    queryFn: () => fetchAnalyticsRevenue(range),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}
