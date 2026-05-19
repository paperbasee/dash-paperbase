"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { themePresetsQueryKey } from "@/lib/query-keys";

export type ThemePresetRow = {
  key: string;
  name: string;
  tokens: Record<string, string>;
};

export type ThemeCardVariantRow = {
  key: string;
  name: string;
  description: string;
};

export type ThemePresetsPayload = {
  presets: ThemePresetRow[];
  card_variants: ThemeCardVariantRow[];
};

export async function fetchThemePresets(): Promise<ThemePresetsPayload> {
  const { data } = await api.get<{
    presets?: ThemePresetRow[];
    card_variants?: ThemeCardVariantRow[];
  }>("theming/presets/");
  return {
    presets: data.presets ?? [],
    card_variants: data.card_variants ?? [],
  };
}

export function useThemePresetsQuery() {
  return useQuery({
    queryKey: themePresetsQueryKey,
    queryFn: fetchThemePresets,
  });
}
