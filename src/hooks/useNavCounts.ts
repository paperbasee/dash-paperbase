"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import api from "@/lib/api";
import type { DashboardStats } from "@/types";
import type { NavCounts } from "@/config/apps";
import { formatCountLocalized } from "@/lib/locale-digits";
import { navCountsQueryKey } from "@/lib/query-keys";

const STALE_MS = 2 * 60 * 1000;

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

export function useNavCounts() {
  const locale = useLocale();

  const formatCount = useCallback(
    (n: number) => formatCountLocalized(n, locale, formatCountBase),
    [locale]
  );

  const query = useQuery({
    queryKey: navCountsQueryKey,
    queryFn: fetchNavCounts,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

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
