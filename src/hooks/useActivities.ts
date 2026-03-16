"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { ActivityLog, PaginatedResponse } from "@/types";

export interface ActivitiesFilters {
  page: number;
  entity_type?: string;
  action?: string;
  actor?: string;
  q?: string;
  start_date?: string;
  end_date?: string;
}

interface ActivitiesState {
  data: PaginatedResponse<ActivityLog> | null;
  loading: boolean;
  error: string | null;
}

export function useActivities(filters: ActivitiesFilters) {
  const [state, setState] = useState<ActivitiesState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchActivities = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    api
      .get<PaginatedResponse<ActivityLog>>("/api/admin/activities/", {
        params: filters,
      })
      .then((res) => setState({ data: res.data, loading: false, error: null }))
      .catch((err) => {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to load activities.";
        setState({ data: null, loading: false, error: message });
      });
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchActivities();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchActivities]);

  return { ...state, refetch: fetchActivities };
}

