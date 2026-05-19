"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { analyticsOverviewQueryKey } from "@/lib/query-keys";
import type { OverviewData } from "@/app/[locale]/(dashboard)/analytics/_components/types";

export type AnalyticsOverviewQueryData = {
  overview: OverviewData;
  cachedAt: number;
  cacheTtlSeconds: number;
};

type OverviewApiResponse = OverviewData & {
  cached_at?: number;
  cache_ttl_seconds?: number;
};

export async function fetchAnalyticsOverview(range: string): Promise<AnalyticsOverviewQueryData> {
  const { data } = await api.get<OverviewApiResponse>(`admin/analytics/overview/?range=${range}`);
  return {
    overview: data,
    cachedAt: typeof data.cached_at === "number" ? data.cached_at : Date.now() / 1000,
    cacheTtlSeconds:
      typeof data.cache_ttl_seconds === "number" ? data.cache_ttl_seconds : 300,
  };
}

export type AnalyticsQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
};

export function useAnalyticsOverviewQuery(
  range: string,
  options?: AnalyticsQueryOptions
) {
  return useQuery({
    queryKey: analyticsOverviewQueryKey(range),
    queryFn: () => fetchAnalyticsOverview(range),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}
