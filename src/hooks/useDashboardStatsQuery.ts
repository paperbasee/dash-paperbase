"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DashboardStats } from "@/types";
import { navCountsQueryKey } from "@/lib/query-keys";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("admin/stats/");
  return data;
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: navCountsQueryKey,
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60 * 1000,
  });
}
