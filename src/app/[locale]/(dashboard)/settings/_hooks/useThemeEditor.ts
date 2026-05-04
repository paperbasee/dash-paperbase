"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";

import api from "@/lib/api";

export type ThemePayload = {
  palette: string;
  card_variant: string;
  resolved_palette: Record<string, string>;
  created_at: string;
  updated_at: string;
};

const DEBOUNCE_MS = 400;

export function useThemeEditor() {
  const [theme, setTheme] = useState<ThemePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<ThemePayload>("theming/");
        if (!cancelled) {
          setTheme({
            ...data,
            card_variant: typeof data.card_variant === "string" ? data.card_variant : "classic",
          });
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(isAxiosError(e) ? (e.response?.data as { detail?: string })?.detail ?? e.message : "load_failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flushPatch = useCallback(async (paletteKey: string, rollbackPalette: string, rollbackResolved: Record<string, string>) => {
    setSaving(true);
    try {
      const { data } = await api.patch<ThemePayload>("theming/", { palette: paletteKey });
      setTheme({
        ...data,
        card_variant: typeof data.card_variant === "string" ? data.card_variant : "classic",
      });
      setError(null);
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
      setError("saveFailed");
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
      setError(null);
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
        const { data } = await api.patch<ThemePayload>("theming/", { card_variant: variantKey });
        setTheme({
          ...data,
          card_variant: typeof data.card_variant === "string" ? data.card_variant : "classic",
        });
        setError(null);
      } catch {
        setTheme((prev) => (prev ? { ...prev, card_variant: rollback } : prev));
        setError("saveFailed");
      } finally {
        setSaving(false);
      }
    },
    [theme]
  );

  return { theme, loading, saving, error, selectPalette, selectCardVariant };
}
