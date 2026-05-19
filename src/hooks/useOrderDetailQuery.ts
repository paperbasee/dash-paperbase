"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Order } from "@/types";
import { orderDetailQueryKey } from "@/lib/query-keys";

export async function fetchOrderDetail(publicId: string): Promise<Order> {
  const { data } = await api.get<Order>(`admin/orders/${publicId}/`);
  return data;
}

export function useOrderDetailQuery(publicId: string) {
  return useQuery({
    queryKey: orderDetailQueryKey(publicId),
    queryFn: () => fetchOrderDetail(publicId),
    enabled: !!publicId,
  });
}
