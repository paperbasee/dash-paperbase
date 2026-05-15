"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocale } from "next-intl";
import api from "@/lib/api";
import type { DashboardStats } from "@/types";
import { formatCountLocalized } from "@/lib/locale-digits";
import { useEnabledApps } from "@/hooks/useEnabledApps";

const REFETCH_MS = 60_000; // 60 seconds
const FOREGROUND_REFETCH_COOLDOWN_MS = 5_000;

function formatCountBase(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function useNavCounts() {
  const locale = useLocale();
  const { enabledOptional } = useEnabledApps();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);
  const lastForegroundFetchAtRef = useRef(0);

  const formatCount = useCallback(
    (n: number) => formatCountLocalized(n, locale, formatCountBase),
    [locale]
  );

  const fetchCounts = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    api
      .get<DashboardStats>("admin/stats/")
      .then((res) => setStats(res.data))
      .catch(() => setStats((prev) => prev))
      .finally(() => {
        setLoading(false);
        inFlightRef.current = false;
      });
  }, [enabledOptional]);

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
    fetchCounts();
    const interval = setInterval(() => {
      if (shouldSkipBackgroundFetch()) return;
      fetchCounts();
    }, REFETCH_MS);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  useEffect(() => {
    const onForeground = () => {
      if (shouldSkipBackgroundFetch() || shouldSkipForegroundFetch()) return;
      fetchCounts();
    };
    const handleFocus = () => onForeground();
    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        onForeground();
      }
    };
    const handleOnline = () => onForeground();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [fetchCounts]);

  if (loading || !stats) {
    return {
      counts: null,
      formatCount,
    };
  }

  return {
    counts: {
      orders: stats.orders.total,
      products: stats.products.active,
      notifications: stats.notifications,
      brands: 0,
      supportTickets: stats.support_tickets,
      banners: stats.banners_count ?? 0,
      blog: stats.blogs_count ?? 0,
    },
    formatCount,
  };
}
