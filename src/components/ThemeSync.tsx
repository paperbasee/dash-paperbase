"use client";

import { useEffect } from "react";
import {
  applyThemePreference,
  CORE_THEME_STORAGE_KEY,
  getStoredThemePreference,
  subscribeToSystemThemeChanges,
  type ThemePreference,
} from "@/lib/theme";

function getInitialPreference(): ThemePreference {
  const stored = getStoredThemePreference();
  return stored ?? "system";
}

/** Keeps root theme class aligned with preference + OS changes after hydration. */
export function ThemeSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let pref: ThemePreference = getInitialPreference();
    applyThemePreference(pref);
    let cleanupSystem: (() => void) | null = null;

    const resubscribeSystem = () => {
      cleanupSystem?.();
      cleanupSystem =
        pref === "system"
          ? subscribeToSystemThemeChanges(() => applyThemePreference("system"))
          : null;
    };
    resubscribeSystem();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== CORE_THEME_STORAGE_KEY) return;
      const next =
        event.newValue === "light" || event.newValue === "dark" || event.newValue === "system"
          ? (event.newValue as ThemePreference)
          : "system";
      pref = next;
      applyThemePreference(pref);
      resubscribeSystem();
    };

    window.addEventListener("storage", onStorage);
    return () => {
      cleanupSystem?.();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}

