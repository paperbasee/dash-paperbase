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
import { isNetworkError } from "@/lib/network-error";

const LIVE_RANGE_REFETCH_MS = 300_000;
const FOREGROUND_REFETCH_COOLDOWN_MS = 5_000;

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
  networkError: boolean;
}

export function useDashboardAnalytics(filters: DashboardAnalyticsFilters) {
  const [state, setState] = useState<AnalyticsState>({
    data: null,
    loading: true,
    error: null,
    networkError: false,
  });
  const inFlightRef = useRef(false);
  const lastForegroundFetchAtRef = useRef(0);

  const fetchAnalytics = useCallback((opts?: { silent?: boolean }) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState((prev) => ({
      ...prev,
      loading: opts?.silent ? prev.loading : true,
      error: null,
      networkError: false,
    }));

    getBasicAnalyticsOverview({
      start_date: filters.startDate,
      end_date: filters.endDate,
      bucket: filters.bucket,
    })
      .then((data) => {
        setState({ data, loading: false, error: null, networkError: false });
      })
      .catch((error) => {
        const netErr = isNetworkError(error);
        const message = netErr
          ? null
          : (error?.response?.data?.detail || error?.message || "Failed to load analytics.");
        setState({ data: null, loading: false, error: message, networkError: netErr });
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [filters.startDate, filters.endDate, filters.bucket]);

  const shouldSkipBackgroundFetch = () =>
    (typeof document !== "undefined" && document.hidden) ||
    (typeof navigator !== "undefined" && navigator.onLine === false);

  const shouldSkipForegroundFetch = () => {
    const now = Date.now();
    if (now - lastForegroundFetchAtRef.current < FOREGROUND_REFETCH_COOLDOWN_MS) {
      return true;
    }
    lastForegroundFetchAtRef.current = now;
    return false;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    // The dashboard overview endpoint is cached server-side; without polling or realtime
    // the dashboard can remain stale while other pages (orders list) update.
    const today = todayYmdInBD(new Date());
    const isLiveRange = filters.endDate >= today;
    if (!isLiveRange) return;

    const intervalMs = LIVE_RANGE_REFETCH_MS;
    const tick = () => {
      if (shouldSkipBackgroundFetch()) return;
      fetchAnalytics({ silent: true });
    };
    const id = window.setInterval(tick, intervalMs);

    const onForeground = () => {
      if (shouldSkipBackgroundFetch() || shouldSkipForegroundFetch()) return;
      fetchAnalytics({ silent: true });
    };
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        onForeground();
      }
    };
    const onOnline = () => onForeground();

    const onFocus = () => onForeground();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [filters.endDate, fetchAnalytics]);

  return {
    ...state,
    refetch: fetchAnalytics,
  };
}
