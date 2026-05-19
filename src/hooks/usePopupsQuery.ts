"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { popupsQueryKey } from "@/lib/query-keys";

export async function fetchPopups(): Promise<unknown | null> {
  const { data } = await api.get<unknown>("admin/popups/");
  return data ?? null;
}

export function usePopupsQuery() {
  return useQuery({
    queryKey: popupsQueryKey,
    queryFn: fetchPopups,
  });
}
