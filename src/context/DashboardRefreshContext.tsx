"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

export type RefreshInterval = "off" | "1m" | "5m" | "15m" | "30m";

const INTERVAL_MS: Record<RefreshInterval, number | null> = {
  off: null,
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
};

const DEFAULT_INTERVAL: RefreshInterval = "5m";

const DASHBOARD_INVALIDATION_KEYS: string[][] = [
  ["orders", "list"],
  ["nav-counts"],
  ["analytics", "overview"],
  ["inventory-status"],
  ["products", "list"],
];

function storageKey(storePublicId: string): string {
  return `paperbase_refresh_interval_v1_${storePublicId}`;
}

function readStoredInterval(storePublicId: string): RefreshInterval {
  if (typeof window === "undefined" || !storePublicId) {
    return DEFAULT_INTERVAL;
  }
  try {
    const raw = localStorage.getItem(storageKey(storePublicId));
    if (
      raw === "off" ||
      raw === "1m" ||
      raw === "5m" ||
      raw === "15m" ||
      raw === "30m"
    ) {
      return raw;
    }
  } catch {
    // ignore
  }
  return DEFAULT_INTERVAL;
}

export interface DashboardRefreshContextValue {
  interval: RefreshInterval;
  setInterval: (interval: RefreshInterval) => void;
  lastRefreshedAt: Date | null;
  isRefreshing: boolean;
  isSocketConnected: boolean;
  refresh: () => Promise<void>;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue | undefined>(
  undefined
);

export interface DashboardRefreshProviderProps {
  storePublicId: string;
  socketConnected: boolean;
  markRefreshedRef: MutableRefObject<(() => void) | null>;
  children: ReactNode;
}

export function DashboardRefreshProvider({
  storePublicId,
  socketConnected,
  markRefreshedRef,
  children,
}: DashboardRefreshProviderProps) {
  const queryClient = useQueryClient();
  const [interval, setIntervalState] = useState<RefreshInterval>(DEFAULT_INTERVAL);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!storePublicId) return;
    setIntervalState(readStoredInterval(storePublicId));
  }, [storePublicId]);

  const setInterval = useCallback(
    (next: RefreshInterval) => {
      setIntervalState(next);
      if (typeof window !== "undefined" && storePublicId) {
        try {
          localStorage.setItem(storageKey(storePublicId), next);
        } catch {
          // ignore
        }
      }
    },
    [storePublicId]
  );

  const markRefreshed = useCallback(() => {
    setLastRefreshedAt(new Date());
  }, []);

  useEffect(() => {
    markRefreshedRef.current = markRefreshed;
    return () => {
      markRefreshedRef.current = null;
    };
  }, [markRefreshed, markRefreshedRef]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(
        DASHBOARD_INVALIDATION_KEYS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      );
      setLastRefreshedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    const ms = INTERVAL_MS[interval];
    if (ms === null) return;
    const id = window.setInterval(() => {
      void refresh();
    }, ms);
    return () => window.clearInterval(id);
  }, [interval, refresh]);

  const value: DashboardRefreshContextValue = {
    interval,
    setInterval,
    lastRefreshedAt,
    isRefreshing,
    isSocketConnected: socketConnected,
    refresh,
  };

  return (
    <DashboardRefreshContext.Provider value={value}>
      {children}
    </DashboardRefreshContext.Provider>
  );
}

export function useDashboardRefresh(): DashboardRefreshContextValue {
  const ctx = useContext(DashboardRefreshContext);
  if (ctx === undefined) {
    throw new Error("useDashboardRefresh must be used within DashboardRefreshProvider");
  }
  return ctx;
}
