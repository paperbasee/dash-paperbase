"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { DashboardStats } from "@/types";

const REFETCH_MS = 30_000; // 30 seconds

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function useNavCounts() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(() => {
    api
      .get<DashboardStats>("admin/stats/")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, REFETCH_MS);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  useEffect(() => {
    const handleFocus = () => fetchCounts();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
      carts: stats.carts,
      wishlist: stats.wishlist,
      categories: stats.categories,
      brands: 0,
      contacts: stats.contacts,
    },
    formatCount,
  };
}
