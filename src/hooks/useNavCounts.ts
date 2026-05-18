"use client";

import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import api from "@/lib/api";
import type { DashboardStats } from "@/types";
import type { NavCounts } from "@/config/apps";
import { formatCountLocalized } from "@/lib/locale-digits";
import { navCountsQueryKey } from "@/lib/query-keys";

const REFETCH_MS = 60_000;
const FOREGROUND_REFETCH_COOLDOWN_MS = 5_000;

let lastForegroundFetchAt = 0;

function formatCountBase(n: number): string {
  return String(n);
}

function mapStatsToNavCounts(stats: DashboardStats): NavCounts {
  return {
    orders: stats.orders.total,
    products: stats.products.active,
    notifications: stats.notifications,
    supportTickets: stats.support_tickets,
    banners: stats.banners_count ?? 0,
    blog: stats.blogs_count ?? 0,
  };
}

export async function fetchNavCounts(): Promise<NavCounts> {
  const { data } = await api.get<DashboardStats>("admin/stats/");
  return mapStatsToNavCounts(data);
}

function shouldSkipForegroundRefetch(): boolean {
  const now = Date.now();
  if (now - lastForegroundFetchAt < FOREGROUND_REFETCH_COOLDOWN_MS) {
    return true;
  }
  lastForegroundFetchAt = now;
  return false;
}

export function useNavCounts() {
  const locale = useLocale();

  const formatCount = useCallback(
    (n: number) => formatCountLocalized(n, locale, formatCountBase),
    [locale]
  );

  const query = useQuery({
    queryKey: navCountsQueryKey,
    queryFn: fetchNavCounts,
    staleTime: REFETCH_MS,
    refetchInterval: REFETCH_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { refetch } = query;

  useEffect(() => {
    const tryForegroundRefetch = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      if (shouldSkipForegroundRefetch()) return;
      void refetch();
    };

    const handleFocus = () => tryForegroundRefetch();
    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        tryForegroundRefetch();
      }
    };
    const handleOnline = () => tryForegroundRefetch();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [refetch]);

  if (query.isLoading || !query.data) {
    return {
      counts: null,
      formatCount,
    };
  }

  return {
    counts: query.data,
    formatCount,
  };
}
