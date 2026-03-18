"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

export type AnalyticsBucket = "day" | "week" | "month";

export interface DashboardAnalyticsSummary {
  totalOrders: number;
  totalProducts: number;
  totalCartItems: number;
  totalWishlistItems: number;
  totalContacts: number;
}

export interface DashboardAnalyticsPoint {
  label: string;
  orders: number;
  products: number;
  cartItems: number;
  wishlistItems: number;
  contacts: number;
}

export interface DashboardAnalyticsResponse {
  summary: DashboardAnalyticsSummary;
  series: DashboardAnalyticsPoint[];
  meta: {
    start_date: string;
    end_date: string;
    bucket: AnalyticsBucket | string;
  };
}

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

  const fetchAnalytics = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    api
      .get<DashboardAnalyticsResponse>("admin/analytics/overview/", {
        params: {
          start_date: filters.startDate,
          end_date: filters.endDate,
          bucket: filters.bucket,
        },
      })
      .then((res) => {
        setState({ data: res.data, loading: false, error: null });
      })
      .catch((error) => {
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          "Failed to load analytics.";
        setState({ data: null, loading: false, error: message });
      });
  }, [filters.startDate, filters.endDate, filters.bucket]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    ...state,
    refetch: fetchAnalytics,
  };
}

