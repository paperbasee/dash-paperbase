"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventoryStatusFromCounts,
  type InventoryStatusLevel,
} from "@/lib/inventory-status";
import { inventoryCountsQueryKey } from "@/lib/query-keys";
import { fetchInventoryCounts } from "@/hooks/useInventoryCountsQuery";

const STALE_MS = 60 * 1000;

export const INVENTORY_STATUS_REFRESH_EVENT = "pb:inventory-status-refresh";

export function useInventoryStatus(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: inventoryCountsQueryKey,
    queryFn: fetchInventoryCounts,
    enabled,
    staleTime: STALE_MS,
    refetchOnWindowFocus: enabled,
    refetchOnReconnect: enabled,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: inventoryCountsQueryKey });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onRefresh = () => refresh();
    window.addEventListener(INVENTORY_STATUS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(INVENTORY_STATUS_REFRESH_EVENT, onRefresh);
  }, [enabled, refresh]);

  const status: InventoryStatusLevel = useMemo(() => {
    if (!enabled || query.isLoading || !query.data) return "none";
    return inventoryStatusFromCounts(
      query.data.outOfStockTotal,
      query.data.lowInStockCount,
    );
  }, [enabled, query.isLoading, query.data]);

  return { status, refresh };
}
