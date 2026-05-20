"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  OPTIONAL_APP_IDS,
  ESSENTIAL_APP_IDS,
  CATALOG_INCLUDED_APP_IDS,
} from "@/config/apps";
import api from "@/lib/api";
import { useStoreSettingsCurrentQuery } from "@/hooks/useStoreSettingsCurrentQuery";

const STORAGE_KEY = "core_enabled_apps";

export type EnabledAppsContextValue = {
  enabledAppIds: Set<string>;
  isEnabled: (appId: string) => boolean;
  toggleApp: (appId: string) => void | Promise<void>;
  enabledOptional: Set<string>;
  isLoading: boolean;
};

const EnabledAppsContext = createContext<EnabledAppsContextValue | undefined>(undefined);

function isAlwaysOnApp(appId: string): boolean {
  return (
    appId === "trash" ||
    (ESSENTIAL_APP_IDS as readonly string[]).includes(appId) ||
    (CATALOG_INCLUDED_APP_IDS as readonly string[]).includes(appId)
  );
}

function loadEnabledOptionalApps(): Set<string> {
  if (typeof window === "undefined") return new Set(OPTIONAL_APP_IDS);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(OPTIONAL_APP_IDS);
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set(OPTIONAL_APP_IDS);
    return new Set(
      parsed.filter((id) =>
        OPTIONAL_APP_IDS.includes(id as (typeof OPTIONAL_APP_IDS)[number])
      )
    );
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
  for (const id of CATALOG_INCLUDED_APP_IDS) {
    out[id] = true;
  }
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

export function EnabledAppsProvider({ children }: { children: ReactNode }) {
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(() =>
    loadEnabledOptionalApps()
  );
  const settingsQuery = useStoreSettingsCurrentQuery();

  useEffect(() => {
    if (!settingsQuery.isFetched) return;
    if (settingsQuery.isError) {
      setEnabledOptional(loadEnabledOptionalApps());
      return;
    }
    if (settingsQuery.data?.modules_enabled) {
      setEnabledOptional(modulesEnabledToSet(settingsQuery.data.modules_enabled));
    }
  }, [settingsQuery.isFetched, settingsQuery.isError, settingsQuery.data]);

  const isEnabled = useCallback(
    (appId: string): boolean => {
      if (isAlwaysOnApp(appId)) return true;
      return enabledOptional.has(appId);
    },
    [enabledOptional]
  );

  const toggleApp = useCallback(
    async (appId: string) => {
      if (isAlwaysOnApp(appId)) return;
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
        await api.patch("store/settings/current/", {
          modules_enabled: setToModulesEnabled(next),
        });
      } catch {
        setEnabledOptional(prev);
        saveEnabledOptionalApps(prev);
      }
    },
    [enabledOptional]
  );

  const enabledAppIds = useMemo(
    () =>
      new Set<string>([...ESSENTIAL_APP_IDS, ...CATALOG_INCLUDED_APP_IDS, ...enabledOptional]),
    [enabledOptional]
  );

  const value = useMemo(
    () => ({
      enabledAppIds,
      isEnabled,
      toggleApp,
      enabledOptional,
      isLoading: settingsQuery.isLoading,
    }),
    [enabledAppIds, isEnabled, toggleApp, enabledOptional, settingsQuery.isLoading]
  );

  return <EnabledAppsContext.Provider value={value}>{children}</EnabledAppsContext.Provider>;
}

export function useEnabledApps(): EnabledAppsContextValue {
  const ctx = useContext(EnabledAppsContext);
  if (!ctx) {
    throw new Error("useEnabledApps must be used within EnabledAppsProvider");
  }
  return ctx;
}
