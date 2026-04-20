"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getBasicAnalyticsOverview,
  type AnalyticsBucket,
  type DashboardAnalyticsPoint,
  type DashboardAnalyticsResponse,
  type DashboardAnalyticsSummary,
} from "@/lib/basicAnalyticsService";
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

interface AnalyticsState {
  data: DashboardAnalyticsResponse | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardAnalytics(filters: DashboardAnalyticsFilters) {
  const [state, setState] = useState<AnalyticsState>({
    data: null,
    loading: true,
    error: null,
  });
  const inFlightRef = useRef(false);

  const fetchAnalytics = useCallback((opts?: { silent?: boolean }) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState((prev) => ({
      ...prev,
      loading: opts?.silent ? prev.loading : true,
      error: null,
    }));

    getBasicAnalyticsOverview({
      start_date: filters.startDate,
      end_date: filters.endDate,
      bucket: filters.bucket,
    })
      .then((data) => {
        setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          "Failed to load analytics.";
        setState({ data: null, loading: false, error: message });
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [filters.startDate, filters.endDate, filters.bucket]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    // The dashboard overview endpoint is cached server-side; without polling or realtime
    // the dashboard can remain stale while other pages (orders list) update.
    const today = todayYmdInBD(new Date());
    const isLiveRange = filters.endDate >= today;
    if (!isLiveRange) return;

    const intervalMs = 20_000;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchAnalytics({ silent: true });
    };
    const id = window.setInterval(tick, intervalMs);

    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [filters.endDate, fetchAnalytics]);

  return {
    ...state,
    refetch: fetchAnalytics,
  };
}
