"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { homeQueryKeyRoot, navCountsQueryKey, ordersListQueryKeyRoot } from "@/lib/query-keys";
import { notify } from "@/notifications";

export interface DashboardRefreshContextValue {
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue | undefined>(
  undefined
);

export function DashboardRefreshProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const t = useTranslations("pages");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // The home page's Refresh: its numbers, its latest orders, and the menu's counts.
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: navCountsQueryKey }),
        queryClient.invalidateQueries({ queryKey: homeQueryKeyRoot }),
        queryClient.invalidateQueries({ queryKey: ordersListQueryKeyRoot }),
      ]);
    } catch (err) {
      notify.error(err, {
        title: t("toastTitleDashboardRefreshFailed"),
        fallbackMessage: t("toastDescDashboardRefreshFailed"),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, t]);

  const value: DashboardRefreshContextValue = {
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
