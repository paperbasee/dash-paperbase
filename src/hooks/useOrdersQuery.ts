"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Order, PaginatedResponse } from "@/types";
import { takeRoutePrefetch } from "@/lib/navigation/route-prefetch-cache";
import { ordersListQueryKey, type OrdersListParams } from "@/lib/query-keys";

export async function fetchOrdersList(
  params: OrdersListParams
): Promise<PaginatedResponse<Order>> {
  const isDefaultListFetch = Object.keys(params).length === 0;
  if (isDefaultListFetch) {
    const prefetched = takeRoutePrefetch<PaginatedResponse<Order>>("/orders");
    if (prefetched) return prefetched;
  }

  const { data } = await api.get<PaginatedResponse<Order>>("admin/orders/", {
    params,
  });
  return data;
}

export function useOrdersQuery(params: OrdersListParams) {
  return useQuery({
    queryKey: ordersListQueryKey(params),
    queryFn: () => fetchOrdersList(params),
  });
}
