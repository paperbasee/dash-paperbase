"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PaginatedResponse, TrashItem } from "@/types";
import { trashQueryKey } from "@/lib/query-keys";
import { DEFAULT_PAGE_SIZE } from "@/lib/paging";

export type TrashQueryData = {
  results: TrashItem[];
  count: number;
  page: number;
  pages: number;
};

export type TrashPage = { page: number; pageSize: number };

export async function fetchTrash({ page, pageSize }: TrashPage): Promise<TrashQueryData> {
  const { data } = await api.get<PaginatedResponse<TrashItem>>("admin/trash/", {
    params: pageSize === DEFAULT_PAGE_SIZE ? { page } : { page, page_size: pageSize },
  });
  return {
    results: data.results ?? [],
    count: data.count ?? 0,
    page: data.page ?? page,
    pages: data.pages ?? 1,
  };
}

export function useTrashQuery(params: TrashPage, enabled: boolean) {
  return useQuery({
    queryKey: trashQueryKey(params),
    queryFn: () => fetchTrash(params),
    enabled,
    // The rows stay on screen while the next page arrives.
    placeholderData: keepPreviousData,
  });
}
