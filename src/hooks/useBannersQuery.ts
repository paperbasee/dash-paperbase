"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Banner, PaginatedResponse } from "@/types";
import { bannersQueryKey } from "@/lib/query-keys";

export type BannersQueryData = {
  banners: Banner[];
  totalCount: number | null;
};

export async function fetchBanners(): Promise<BannersQueryData> {
  const { data } = await api.get<PaginatedResponse<Banner> | Banner[]>("admin/banners/");
  if (Array.isArray(data)) {
    return { banners: data, totalCount: null };
  }
  return {
    banners: data.results,
    totalCount: typeof data.count === "number" ? data.count : null,
  };
}

export function useBannersQuery() {
  return useQuery({
    queryKey: bannersQueryKey,
    queryFn: fetchBanners,
  });
}
