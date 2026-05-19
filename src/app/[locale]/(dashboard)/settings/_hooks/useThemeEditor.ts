"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiHttpError } from "@/lib/api-client";

import api from "@/lib/api";
import { useThemeQuery, type ThemePayload } from "@/hooks/useThemeQuery";
import { queryClient } from "@/components/QueryProvider";
import { brandingQueryKey, themeQueryKey } from "@/lib/query-keys";

export type { ThemePayload };

const DEBOUNCE_MS = 400;

export function useThemeEditor() {
  const { data, isLoading, isError, error } = useThemeQuery();
  const [theme, setTheme] = useState<ThemePayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const flushPatch = useCallback(async (paletteKey: string, rollbackPalette: string, rollbackResolved: Record<string, string>) => {
    setSaving(true);
    try {
      const { data: patchData } = await api.patch<ThemePayload>("theming/", { palette: paletteKey });
      setTheme({
        ...patchData,
        card_variant: typeof patchData.card_variant === "string" ? patchData.card_variant : "classic",
      });
      setErrorState(null);
      void queryClient.invalidateQueries({ queryKey: themeQueryKey });
      void queryClient.invalidateQueries({ queryKey: brandingQueryKey });
    } catch {
      setTheme((prev) =>
        prev
          ? {
              ...prev,
              palette: rollbackPalette,
              resolved_palette: rollbackResolved,
            }
          : prev
      );
      setErrorState("saveFailed");
    } finally {
      setSaving(false);
    }
  }, []);

  const selectPalette = useCallback(
    (paletteKey: string, resolved: Record<string, string>) => {
      const rollbackPalette = theme?.palette ?? "";
      const rollbackResolved = theme?.resolved_palette ?? {};
      setTheme((prev) =>
        prev
          ? {
              ...prev,
              palette: paletteKey,
              resolved_palette: resolved,
            }
          : prev
      );
      setErrorState(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void flushPatch(paletteKey, rollbackPalette, rollbackResolved);
      }, DEBOUNCE_MS);
    },
    [theme?.palette, theme?.resolved_palette, flushPatch]
  );

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

  return { theme, loading: isLoading, saving, error: errorState, selectPalette, selectCardVariant };
}
