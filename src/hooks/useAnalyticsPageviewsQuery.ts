"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { analyticsPageviewsQueryKey } from "@/lib/query-keys";
import type { PageviewsComparison, PageviewsPoint } from "@/app/[locale]/(dashboard)/analytics/_components/types";
import type { AnalyticsQueryOptions } from "@/hooks/useAnalyticsOverviewQuery";

export async function fetchAnalyticsPageviews(range: string): Promise<PageviewsComparison> {
  const { data: pv } = await api.get<{
    data: PageviewsPoint[];
    comparison: PageviewsPoint[];
    summary: {
      current_pageviews: number;
      previous_pageviews: number;
      pageviews_pct_change: number | null;
      current_sessions: number;
      previous_sessions: number;
      sessions_pct_change: number | null;
    };
  }>(`admin/analytics/pageviews/?range=${range}`);

  return {
    data: Array.isArray(pv.data) ? pv.data : [],
    comparison: Array.isArray(pv.comparison) ? pv.comparison : [],
    summary: {
      current_pageviews: pv.summary?.current_pageviews ?? 0,
      previous_pageviews: pv.summary?.previous_pageviews ?? 0,
      pageviews_pct_change: pv.summary?.pageviews_pct_change ?? null,
      current_sessions: pv.summary?.current_sessions ?? 0,
      previous_sessions: pv.summary?.previous_sessions ?? 0,
      sessions_pct_change: pv.summary?.sessions_pct_change ?? null,
    },
  };
}

export function useAnalyticsPageviewsQuery(
  range: string,
  options?: AnalyticsQueryOptions
) {
  return useQuery({
    queryKey: analyticsPageviewsQueryKey(range),
    queryFn: () => fetchAnalyticsPageviews(range),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}
