"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
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

export function useOrdersQuery(
  params: OrdersListParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ordersListQueryKey(params),
    queryFn: () => fetchOrdersList(params),
    enabled: options?.enabled ?? true,
    // The page being read stays on screen while the next one is fetched, so turning a page
    // never blanks the table. The pager asks for the next page on hover, so by the time a
    // click lands the rows are usually already here.
    placeholderData: keepPreviousData,
  });
}
