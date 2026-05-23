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

export interface DashboardRefreshContextValue {
  lastRefreshedAt: Date | null;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue | undefined>(
  undefined
);

export interface DashboardRefreshProviderProps {
  markRefreshedRef: MutableRefObject<(() => void) | null>;
  children: ReactNode;
}

export function DashboardRefreshProvider({
  markRefreshedRef,
  children,
}: DashboardRefreshProviderProps) {
  const queryClient = useQueryClient();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nav-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory", "counts"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "list"] }),
      ]);
      setLastRefreshedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const value: DashboardRefreshContextValue = {
    lastRefreshedAt,
    isRefreshing,
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
