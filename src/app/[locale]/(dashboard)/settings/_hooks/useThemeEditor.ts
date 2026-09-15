"use client";

import { useCallback, useEffect, useState } from "react";
import { isApiHttpError } from "@/lib/api-client";

import api from "@/lib/api";
import { useThemeQuery, type ThemePayload } from "@/hooks/useThemeQuery";
import { queryClient } from "@/components/QueryProvider";
import { brandingQueryKey, themeQueryKey } from "@/lib/query-keys";

export type { ThemePayload };

export function useThemeEditor() {
  const { data, isLoading, isError, error } = useThemeQuery();
  const [theme, setTheme] = useState<ThemePayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setTheme(data);
      setErrorState(null);
    }
  }, [data]);

  useEffect(() => {
    if (!isError) return;
    setErrorState(
      isApiHttpError(error)
        ? (error.response?.data as { detail?: string })?.detail ?? error.message
        : "load_failed",
    );
  }, [isError, error]);

  const selectCardVariant = useCallback(
    async (variantKey: string) => {
      if (!theme) return;
      const rollback = theme.card_variant;
      setTheme((prev) => (prev ? { ...prev, card_variant: variantKey } : prev));
      setSaving(true);
      try {
        const { data: patchData } = await api.patch<ThemePayload>("theming/", { card_variant: variantKey });
        setTheme({
          ...patchData,
          card_variant: typeof patchData.card_variant === "string" ? patchData.card_variant : "classic",
        });
        setErrorState(null);
        void queryClient.invalidateQueries({ queryKey: themeQueryKey });
        void queryClient.invalidateQueries({ queryKey: brandingQueryKey });
      } catch {
        setTheme((prev) => (prev ? { ...prev, card_variant: rollback } : prev));
        setErrorState("saveFailed");
      } finally {
        setSaving(false);
      }
    },
    [theme]
  );

  return {
    theme,
    loading: isLoading,
    saving,
    error: errorState,
    selectCardVariant,
  };
}
