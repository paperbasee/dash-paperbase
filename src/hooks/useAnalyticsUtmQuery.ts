"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { analyticsUtmQueryKey } from "@/lib/query-keys";
import type { UTMData } from "@/app/[locale]/(dashboard)/analytics/_components/types";
import type { AnalyticsQueryOptions } from "@/hooks/useAnalyticsOverviewQuery";

export async function fetchAnalyticsUtm(
  range: string,
  dimension: string
): Promise<UTMData> {
  const { data } = await api.get<UTMData>(
    `admin/analytics/utm/?range=${range}&dimension=${dimension}`
  );
  return data;
}

export function useAnalyticsUtmQuery(
  range: string,
  dimension: "source" | "medium" | "campaign",
  options?: AnalyticsQueryOptions
) {
  return useQuery({
    queryKey: analyticsUtmQueryKey(range, dimension),
    queryFn: () => fetchAnalyticsUtm(range, dimension),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}
