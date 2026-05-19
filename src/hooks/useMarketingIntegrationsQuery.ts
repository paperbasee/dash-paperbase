"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { MarketingIntegration, PaginatedResponse } from "@/types";
import { marketingIntegrationsQueryKey } from "@/lib/query-keys";

export async function fetchMarketingIntegrations(): Promise<MarketingIntegration[]> {
  const { data } = await api.get<
    PaginatedResponse<MarketingIntegration> | MarketingIntegration[]
  >("admin/marketing-integrations/");
  return Array.isArray(data) ? data : (data.results ?? []);
}

export function useMarketingIntegrationsQuery() {
  return useQuery({
    queryKey: marketingIntegrationsQueryKey,
    queryFn: fetchMarketingIntegrations,
  });
}
