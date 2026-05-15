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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchFromBackend() {
      try {
        const { data } = await api.get<{ modules_enabled?: Record<string, boolean> }>(
          "store/settings/current/"
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
    void fetchFromBackend();
    return () => {
      cancelled = true;
    };
  }, []);

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
      isLoading,
    }),
    [enabledAppIds, isEnabled, toggleApp, enabledOptional, isLoading]
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
