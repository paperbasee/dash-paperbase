"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PaginatedResponse, TrashItem } from "@/types";
import { trashQueryKey } from "@/lib/query-keys";

export type TrashQueryData = {
  results: TrashItem[];
  count: number;
  hasNext: boolean;
};

export async function fetchTrash(page: number): Promise<TrashQueryData> {
  const { data } = await api.get<PaginatedResponse<TrashItem>>("admin/trash/", {
    params: { page },
  });
  return {
    results: data.results ?? [],
    count: data.count ?? 0,
    hasNext: !!data.next,
  };
}

export function useTrashQuery(page: number, enabled: boolean) {
  return useQuery({
    queryKey: trashQueryKey(page),
    queryFn: () => fetchTrash(page),
    enabled,
  });
}
