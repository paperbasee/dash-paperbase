"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { analyticsPagesQueryKey } from "@/lib/query-keys";
import type { PageRow } from "@/app/[locale]/(dashboard)/analytics/_components/types";
import type { AnalyticsQueryOptions } from "@/hooks/useAnalyticsOverviewQuery";

export async function fetchAnalyticsPages(range: string): Promise<PageRow[]> {
  const { data: pages } = await api.get<{ data: PageRow[] }>(
    `admin/analytics/pages/?range=${range}`
  );
  return Array.isArray(pages.data) ? pages.data : [];
}

export function useAnalyticsPagesQuery(
  range: string,
  options?: AnalyticsQueryOptions
) {
  return useQuery({
    queryKey: analyticsPagesQueryKey(range),
    queryFn: () => fetchAnalyticsPages(range),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}
