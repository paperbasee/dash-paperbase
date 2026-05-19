"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DashboardStats } from "@/types";
import { dashboardStatsQueryKey } from "@/lib/query-keys";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("admin/stats/");
  return data;
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: dashboardStatsQueryKey,
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60 * 1000,
  });
}
