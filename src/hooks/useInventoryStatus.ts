"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";
import {
  inventoryStatusFromCounts,
  type InventoryStatusLevel,
} from "@/lib/inventory-status";

const REFETCH_MS = 30_000;

export const INVENTORY_STATUS_REFRESH_EVENT = "pb:inventory-status-refresh";

export function useInventoryStatus(enabled: boolean) {
  const [outCount, setOutCount] = useState(0);
  const [lowInStockCount, setLowInStockCount] = useState(0);
  const [ready, setReady] = useState(false);

  const fetchStatus = useCallback(() => {
    if (!enabled) return;
    Promise.all([
      api.get<PaginatedResponse<unknown>>("admin/inventory/", {
        params: { stock: "out_of_stock", page: 1 },
      }),
      api.get<PaginatedResponse<unknown>>("admin/inventory/", {
        params: { stock: "low_in_stock", page: 1 },
      }),
    ])
      .then(([outRes, lowRes]) => {
        setOutCount(outRes.data.count ?? 0);
        setLowInStockCount(lowRes.data.count ?? 0);
      })
      .catch(() => {
        setOutCount(0);
        setLowInStockCount(0);
      })
      .finally(() => setReady(true));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setOutCount(0);
      setLowInStockCount(0);
      setReady(false);
      return;
    }
    setReady(false);
    fetchStatus();
    const interval = setInterval(fetchStatus, REFETCH_MS);
    return () => clearInterval(interval);
  }, [enabled, fetchStatus]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, fetchStatus]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onRefresh = () => fetchStatus();
    window.addEventListener(INVENTORY_STATUS_REFRESH_EVENT, onRefresh);
    return () =>
      window.removeEventListener(INVENTORY_STATUS_REFRESH_EVENT, onRefresh);
  }, [enabled, fetchStatus]);

  const status: InventoryStatusLevel = useMemo(() => {
    if (!enabled || !ready) return "none";
    return inventoryStatusFromCounts(outCount, lowInStockCount);
  }, [enabled, ready, outCount, lowInStockCount]);

  return { status, refresh: fetchStatus };
}
