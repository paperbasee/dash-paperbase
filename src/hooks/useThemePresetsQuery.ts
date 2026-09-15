"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { themePresetsQueryKey } from "@/lib/query-keys";

export type ThemeCardVariantRow = {
  key: string;
  name: string;
  description: string;
};

export type ThemePresetsPayload = {
  card_variants: ThemeCardVariantRow[];
};

export async function fetchThemePresets(): Promise<ThemePresetsPayload> {
  const { data } = await api.get<{
    card_variants?: ThemeCardVariantRow[];
  }>("theming/presets/");
  return {
    card_variants: data.card_variants ?? [],
  };
}

export function useThemePresetsQuery() {
  return useQuery({
    queryKey: themePresetsQueryKey,
    queryFn: fetchThemePresets,
  });
}
