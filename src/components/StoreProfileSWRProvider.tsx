"use client";

import { useMemo, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { STORE_PROFILE_SWR_PREFIX } from "@/hooks/useBrandingProfileSWR";

const STORE_PROFILE_CACHE_STORAGE_KEY = "store-profile-cache";

type SWRCacheKey = string;
type SWRCacheValue = unknown;

function canUseStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__swr_store_profile_cache_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function readPersistedEntries(): Array<[SWRCacheKey, SWRCacheValue]> {
  try {
    const raw = window.localStorage.getItem(STORE_PROFILE_CACHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<[SWRCacheKey, SWRCacheValue]>;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is [SWRCacheKey, SWRCacheValue] =>
        Array.isArray(entry) &&
        typeof entry[0] === "string" &&
        entry[0].startsWith(STORE_PROFILE_SWR_PREFIX)
    );
  } catch {
    return [];
  }
}

function writePersistedEntries(map: Map<SWRCacheKey, SWRCacheValue>) {
  try {
    const storeProfileEntries = Array.from(map.entries()).filter(([key]) =>
      key.startsWith(STORE_PROFILE_SWR_PREFIX)
    );
    window.localStorage.setItem(
      STORE_PROFILE_CACHE_STORAGE_KEY,
      JSON.stringify(storeProfileEntries)
    );
  } catch {
    // localStorage can throw in private mode/quota scenarios. Fail silently.
  }
}

function localStorageProvider() {
  if (!canUseStorage()) {
    return new Map<SWRCacheKey, SWRCacheValue>();
  }

  const map = new Map<SWRCacheKey, SWRCacheValue>(readPersistedEntries());
  const persist = () => writePersistedEntries(map);

  const originalSet = map.set.bind(map);
  map.set = (key, value) => {
    const result = originalSet(key, value);
    if (key.startsWith(STORE_PROFILE_SWR_PREFIX)) {
      persist();
    }
    return result;
  };

  const originalDelete = map.delete.bind(map);
  map.delete = (key) => {
    const deleted = originalDelete(key);
    if (key.startsWith(STORE_PROFILE_SWR_PREFIX)) {
      persist();
    }
    return deleted;
  };

  const originalClear = map.clear.bind(map);
  map.clear = () => {
    originalClear();
    persist();
  };

  window.addEventListener("beforeunload", persist);
  return map;
}

export default function StoreProfileSWRProvider({
  children,
}: {
  children: ReactNode;
}) {
  const swrConfigValue = useMemo(
    () => ({
      provider: localStorageProvider,
    }),
    []
  );

  return <SWRConfig value={swrConfigValue}>{children}</SWRConfig>;
}
