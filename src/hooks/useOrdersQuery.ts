"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Order, PaginatedResponse } from "@/types";
import { ordersListQueryKey, type OrdersListParams } from "@/lib/query-keys";

export async function fetchOrdersList(
  params: OrdersListParams
): Promise<PaginatedResponse<Order>> {
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
