"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";
import {
  inventoryStatusFromCounts,
  type InventoryStatusLevel,
} from "@/lib/inventory-status";
import { inventoryStatusQueryKey } from "@/lib/query-keys";

const REFETCH_MS = 30_000;

export const INVENTORY_STATUS_REFRESH_EVENT = "pb:inventory-status-refresh";

type InventoryStatusData = {
  outCount: number;
  lowInStockCount: number;
};

async function fetchInventoryStatus(): Promise<InventoryStatusData> {
  const [outRes, lowRes] = await Promise.all([
    api.get<PaginatedResponse<unknown>>("admin/inventory/", {
      params: { stock: "out_of_stock", page: 1 },
    }),
    api.get<PaginatedResponse<unknown>>("admin/inventory/", {
      params: { stock: "low_in_stock", page: 1 },
    }),
  ]);
  return {
    outCount: outRes.data.count ?? 0,
    lowInStockCount: lowRes.data.count ?? 0,
  };
}

export function useInventoryStatus(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: inventoryStatusQueryKey,
    queryFn: fetchInventoryStatus,
    enabled,
    staleTime: REFETCH_MS,
    refetchInterval: enabled ? REFETCH_MS : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: enabled,
    refetchOnReconnect: enabled,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: inventoryStatusQueryKey });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onRefresh = () => refresh();
    window.addEventListener(INVENTORY_STATUS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(INVENTORY_STATUS_REFRESH_EVENT, onRefresh);
  }, [enabled, refresh]);

  const status: InventoryStatusLevel = useMemo(() => {
    if (!enabled || query.isLoading || !query.data) return "none";
    return inventoryStatusFromCounts(query.data.outCount, query.data.lowInStockCount);
  }, [enabled, query.isLoading, query.data]);

  return { status, refresh };
}
