"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Inventory, PaginatedResponse } from "@/types";
import { inventoryCountsQueryKey, inventoryListQueryKey, type InventoryListParams } from "@/lib/query-keys";
import { fetchInventoryCounts } from "@/hooks/useInventoryCountsQuery";

export type InventoryListData = {
  list: PaginatedResponse<Inventory>;
  lowStockTotal: number;
  outOfStockTotal: number;
};

export async function fetchInventoryList(
  params: InventoryListParams,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<InventoryListData> {
  const [listRes, counts] = await Promise.all([
    api.get<PaginatedResponse<Inventory>>("admin/inventory/", { params }),
    queryClient.fetchQuery({
      queryKey: inventoryCountsQueryKey,
      queryFn: fetchInventoryCounts,
    }),
  ]);

  return {
    list: listRes.data,
    lowStockTotal: counts.lowStockTotal,
    outOfStockTotal: counts.outOfStockTotal,
  };
}

export function useInventoryListQuery(params: InventoryListParams) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: inventoryListQueryKey(params),
    queryFn: () => fetchInventoryList(params, queryClient),
  });
}
