"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { analyticsDevicesQueryKey } from "@/lib/query-keys";
import type { DevicesData } from "@/app/[locale]/(dashboard)/analytics/_components/types";
import type { AnalyticsQueryOptions } from "@/hooks/useAnalyticsOverviewQuery";

export async function fetchAnalyticsDevices(
  range: string
): Promise<{ device: string; sessions: number }[]> {
  const { data: devices } = await api.get<DevicesData>(
    `admin/analytics/devices/?range=${range}`
  );
  return Array.isArray(devices.data) ? devices.data : [];
}

export function useAnalyticsDevicesQuery(
  range: string,
  options?: AnalyticsQueryOptions
) {
  return useQuery({
    queryKey: analyticsDevicesQueryKey(range),
    queryFn: () => fetchAnalyticsDevices(range),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });
}
