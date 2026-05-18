"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getBasicAnalyticsOverview,
  type AnalyticsBucket,
  type DashboardAnalyticsPoint,
  type DashboardAnalyticsResponse,
  type DashboardAnalyticsSummary,
} from "@/lib/basicAnalyticsService";
import { isNetworkError } from "@/lib/network-error";
import { dashboardAnalyticsQueryKey } from "@/lib/query-keys";

export type {
  AnalyticsBucket,
  DashboardAnalyticsPoint,
  DashboardAnalyticsResponse,
  DashboardAnalyticsSummary,
};

export interface DashboardAnalyticsFilters {
  startDate: string;
  endDate: string;
  bucket: AnalyticsBucket;
}

export function useDashboardAnalyticsQuery(filters: DashboardAnalyticsFilters) {
  const queryKey = dashboardAnalyticsQueryKey(filters);

  const query = useQuery({
    queryKey,
    queryFn: () =>
      getBasicAnalyticsOverview({
        start_date: filters.startDate,
        end_date: filters.endDate,
        bucket: filters.bucket,
      }),
    staleTime: 2 * 60 * 1000,
  });

  const networkError = query.isError && isNetworkError(query.error);
  const errorMessage =
    query.isError && !networkError
      ? ((query.error as { response?: { data?: { detail?: unknown } }; message?: string })
          ?.response?.data?.detail as string | undefined) ||
        (query.error as Error)?.message ||
        "Failed to load analytics."
      : null;

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: errorMessage,
    networkError,
    refetch: query.refetch,
  };
}
