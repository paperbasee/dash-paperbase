"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Courier, PaginatedResponse } from "@/types";
import { couriersQueryKey } from "@/lib/query-keys";

export async function fetchCouriers(): Promise<Courier[]> {
  const { data } = await api.get<PaginatedResponse<Courier> | Courier[]>("admin/couriers/");
  return Array.isArray(data) ? data : (data.results ?? []);
}

export function useCouriersQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: couriersQueryKey,
    queryFn: fetchCouriers,
    enabled: options?.enabled ?? true,
  });
}
