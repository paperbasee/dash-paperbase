"use client";

import { useState, useCallback, useEffect } from "react";
import {
  OPTIONAL_APP_IDS,
  ESSENTIAL_APP_IDS,
} from "@/config/apps";
import api from "@/lib/api";

const STORAGE_KEY = "core_enabled_apps";

function loadEnabledOptionalApps(): Set<string> {
  if (typeof window === "undefined") return new Set(OPTIONAL_APP_IDS);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(OPTIONAL_APP_IDS);
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set(OPTIONAL_APP_IDS);
    return new Set(parsed.filter((id) => OPTIONAL_APP_IDS.includes(id as (typeof OPTIONAL_APP_IDS)[number])));
  } catch {
    return new Set(OPTIONAL_APP_IDS);
  }
}

function saveEnabledOptionalApps(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function setToModulesEnabled(enabled: Set<string>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const id of OPTIONAL_APP_IDS) {
    out[id] = enabled.has(id);
  }
  return out;
}

function modulesEnabledToSet(modules: Record<string, boolean> | null | undefined): Set<string> {
  if (!modules || typeof modules !== "object") return new Set(OPTIONAL_APP_IDS);
  const out = new Set<string>();
  for (const id of OPTIONAL_APP_IDS) {
    if (modules[id] !== false) out.add(id);
  }
  return out;
}

export function useEnabledApps() {
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(() =>
    loadEnabledOptionalApps()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchFromBackend() {
      try {
        const { data } = await api.get<{ modules_enabled?: Record<string, boolean> }>(
          "stores/settings/current/"
        );
        if (!cancelled && data?.modules_enabled) {
          setEnabledOptional(modulesEnabledToSet(data.modules_enabled));
        }
      } catch {
        if (!cancelled) {
          setEnabledOptional(loadEnabledOptionalApps());
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchFromBackend();
    return () => { cancelled = true; };
  }, []);

  const isEnabled = useCallback(
    (appId: string): boolean => {
      if (ESSENTIAL_APP_IDS.includes(appId as (typeof ESSENTIAL_APP_IDS)[number])) return true;
      return enabledOptional.has(appId);
    },
    [enabledOptional]
  );

  const toggleApp = useCallback(async (appId: string) => {
    if (ESSENTIAL_APP_IDS.includes(appId as (typeof ESSENTIAL_APP_IDS)[number])) return;
    const prev = new Set(enabledOptional);
    const next = new Set(prev);
    if (next.has(appId)) {
      next.delete(appId);
    } else {
      next.add(appId);
    }
    setEnabledOptional(next);
    saveEnabledOptionalApps(next);

    try {
      await api.patch("stores/settings/current/", {
        modules_enabled: setToModulesEnabled(next),
      });
    } catch {
      setEnabledOptional(prev);
      saveEnabledOptionalApps(prev);
    }
  }, [enabledOptional]);

  const enabledAppIds = useCallback(() => {
    return new Set<string>([...ESSENTIAL_APP_IDS, ...enabledOptional]);
  }, [enabledOptional]);

  return {
    enabledAppIds: enabledAppIds(),
    isEnabled,
    toggleApp,
    enabledOptional,
    isLoading,
  };
}
