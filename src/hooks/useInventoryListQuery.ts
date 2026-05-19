"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Inventory, PaginatedResponse } from "@/types";
import { inventoryListQueryKey, type InventoryListParams } from "@/lib/query-keys";

export type InventoryListData = {
  list: PaginatedResponse<Inventory>;
  lowStockTotal: number;
  outOfStockTotal: number;
};

export async function fetchInventoryList(
  params: InventoryListParams,
): Promise<InventoryListData> {
  const [listRes, lowRes, outRes] = await Promise.all([
    api.get<PaginatedResponse<Inventory>>("admin/inventory/", { params }),
    api.get<PaginatedResponse<Inventory>>("admin/inventory/", {
      params: { stock: "low_stock", page: 1 },
    }),
    api.get<PaginatedResponse<Inventory>>("admin/inventory/", {
      params: { stock: "out_of_stock", page: 1 },
    }),
  ]);

  return {
    list: listRes.data,
    lowStockTotal: lowRes.data.count ?? 0,
    outOfStockTotal: outRes.data.count ?? 0,
  };
}

export function useInventoryListQuery(params: InventoryListParams) {
  return useQuery({
    queryKey: inventoryListQueryKey(params),
    queryFn: () => fetchInventoryList(params),
  });
}
