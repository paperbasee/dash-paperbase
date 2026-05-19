"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { apiKeysQueryKey } from "@/lib/query-keys";

export type APIKeyRow = {
  public_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  revoked_at: string | null;
};

/** Hide legacy auto-created keys from store onboarding (no longer created server-side). */
const LEGACY_AUTO_KEY_NAME = "Bootstrap Public";

function extractRows(data: unknown): APIKeyRow[] {
  const active = (row: APIKeyRow) =>
    !row.revoked_at && row.name !== LEGACY_AUTO_KEY_NAME;
  const rows = Array.isArray(data)
    ? (data as APIKeyRow[])
    : data && typeof data === "object" && "results" in data
      ? (((data as { results?: APIKeyRow[] }).results ?? []) as APIKeyRow[])
      : [];

  const filtered = rows.filter(active).sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta;
    return String(b.created_at).localeCompare(String(a.created_at));
  });
  return filtered.length ? [filtered[0]] : [];
}

export async function fetchApiKeys(): Promise<APIKeyRow[]> {
  const { data } = await api.get("settings/network/api-keys/");
  return extractRows(data);
}

export function useApiKeysQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: apiKeysQueryKey,
    queryFn: fetchApiKeys,
    enabled: options?.enabled ?? true,
  });
}
