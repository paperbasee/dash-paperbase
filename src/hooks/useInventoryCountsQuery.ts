"use client";

import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export type InventoryCounts = {
  outOfStockTotal: number;
  /** Sidebar badge: tracked rows above zero but at/below threshold. */
  lowInStockCount: number;
  /** Inventory list header: all tracked rows at/below threshold. */
  lowStockTotal: number;
};

export async function fetchInventoryCounts(): Promise<InventoryCounts> {
  const [outRes, lowInStockRes, lowStockRes] = await Promise.all([
    api.get<PaginatedResponse<unknown>>("admin/inventory/", {
      params: { stock: "out_of_stock", page: 1 },
    }),
    api.get<PaginatedResponse<unknown>>("admin/inventory/", {
      params: { stock: "low_in_stock", page: 1 },
    }),
    api.get<PaginatedResponse<unknown>>("admin/inventory/", {
      params: { stock: "low_stock", page: 1 },
    }),
  ]);
  return {
    outOfStockTotal: outRes.data.count ?? 0,
    lowInStockCount: lowInStockRes.data.count ?? 0,
    lowStockTotal: lowStockRes.data.count ?? 0,
  };
}
