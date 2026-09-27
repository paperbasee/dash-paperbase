"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DistrictDivision } from "@/lib/orders/districts";
import { districtsQueryKey } from "@/lib/query-keys";

/** The list changes with a release, not a day's work: fetched once a day at most. */
const DISTRICTS_STALE_MS = 24 * 60 * 60 * 1000;

export async function fetchDistricts(): Promise<DistrictDivision[]> {
  const { data } = await api.get<{ divisions: DistrictDivision[] }>("admin/districts/");
  return data.divisions;
}

export function useDistrictsQuery() {
  return useQuery({
    queryKey: districtsQueryKey,
    queryFn: fetchDistricts,
    staleTime: DISTRICTS_STALE_MS,
  });
}
