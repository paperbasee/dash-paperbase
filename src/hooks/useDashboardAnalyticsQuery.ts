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
import { takeRoutePrefetch } from "@/lib/navigation/route-prefetch-cache";
import { dashboardAnalyticsQueryKey } from "@/lib/query-keys";
import { todayYmdInBD } from "@/utils/time";

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
    queryFn: async () => {
      const today = todayYmdInBD(new Date());
      const isDefaultToday =
        filters.startDate === today &&
        filters.endDate === today &&
        filters.bucket === "hour";

      if (isDefaultToday) {
        const prefetched = takeRoutePrefetch<DashboardAnalyticsResponse>("/");
        if (prefetched) return prefetched;
      }

      return getBasicAnalyticsOverview({
        start_date: filters.startDate,
        end_date: filters.endDate,
        bucket: filters.bucket,
      });
    },
    refetchInterval: (q) => {
      const today = todayYmdInBD(new Date());
      const isLiveRange = filters.endDate >= today;
      if (!isLiveRange) return false;
      return 300_000;
    },
    refetchIntervalInBackground: false,
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
