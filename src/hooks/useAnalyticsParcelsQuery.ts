"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { analyticsParcelsQueryKey } from "@/lib/query-keys";
import type { ParcelsData } from "@/app/[locale]/(dashboard)/analytics/_components/types";
import type { AnalyticsQueryOptions } from "@/hooks/useAnalyticsOverviewQuery";

export async function fetchAnalyticsParcels(range: string): Promise<ParcelsData> {
  const { data } = await api.get<ParcelsData>(`admin/analytics/parcels/?range=${range}`);
  return data;
}

export function useAnalyticsParcelsQuery(
  range: string,
  options?: AnalyticsQueryOptions
) {
  return useQuery({
    queryKey: analyticsParcelsQueryKey(range),
    queryFn: () => fetchAnalyticsParcels(range),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}
