"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { themeQueryKey } from "@/lib/query-keys";

export type ThemePayload = {
  palette: string;
  card_variant: string;
  resolved_palette: Record<string, string>;
  created_at: string;
  updated_at: string;
};

function normalizeTheme(data: ThemePayload): ThemePayload {
  return {
    ...data,
    card_variant: typeof data.card_variant === "string" ? data.card_variant : "classic",
  };
}

export async function fetchTheme(): Promise<ThemePayload> {
  const { data } = await api.get<ThemePayload>("theming/");
  return normalizeTheme(data);
}

export function useThemeQuery() {
  return useQuery({
    queryKey: themeQueryKey,
    queryFn: fetchTheme,
  });
}
