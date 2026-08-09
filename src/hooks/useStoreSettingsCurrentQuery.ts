"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { storeSettingsCurrentQueryKey } from "@/lib/query-keys";

const STALE_MS = 5 * 60 * 1000;

export type StoreSettingsCurrent = {
  modules_enabled?: Record<string, boolean>;
  low_stock_threshold?: number;
  extra_field_schema?: unknown;
  email_notify_owner_on_order_received: boolean;
  email_customer_on_order_confirmed: boolean;
  public_api_enabled?: boolean;
  storefront_url?: string | null;
  revalidate_secret?: string | null;
  autopilot_enabled?: boolean;
  autopilot_min_success_ratio?: number;
  autopilot_min_total_parcels?: number;
  autopilot_max_order_value?: string | number;
};

export async function fetchStoreSettingsCurrent(): Promise<StoreSettingsCurrent> {
  const { data } = await api.get<StoreSettingsCurrent>("store/settings/current/");
  return data;
}

export function useStoreSettingsCurrentQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: storeSettingsCurrentQueryKey,
    queryFn: fetchStoreSettingsCurrent,
    staleTime: STALE_MS,
    enabled: options?.enabled ?? true,
  });
}
