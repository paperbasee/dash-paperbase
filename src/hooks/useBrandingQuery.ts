"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Branding } from "@/types";
import { brandingQueryKey } from "@/lib/query-keys";

const BRANDING_PROFILE_ENDPOINT = "admin/branding/";

async function fetchBrandingProfile(): Promise<Branding> {
  const { data } = await api.get<Branding>(BRANDING_PROFILE_ENDPOINT);
  return data;
}

export { brandingQueryKey };

export function useBrandingQuery() {
  return useQuery({
    queryKey: brandingQueryKey,
    queryFn: fetchBrandingProfile,
  });
}
