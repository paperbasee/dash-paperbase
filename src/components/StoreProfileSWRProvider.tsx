"use client";

import { useMemo, type ReactNode } from "react";
import { SWRConfig, type Cache } from "swr";
import { STORE_PROFILE_SWR_PREFIX } from "@/hooks/useBrandingProfileSWR";

const STORE_PROFILE_CACHE_STORAGE_KEY = "store-profile-cache";
const STORE_PROFILE_CACHE_MAX_AGE_MS = 86_400_000;

type SWRCacheKey = string;
type SWRCacheValue = any;
type SWRCache = Cache<any>;

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
    const parsed = JSON.parse(raw) as
      | Array<[SWRCacheKey, SWRCacheValue]>
      | { timestamp?: number; entries?: Array<[SWRCacheKey, SWRCacheValue]> };
    const entries = Array.isArray(parsed) ? parsed : parsed?.entries;
    const timestamp = !Array.isArray(parsed) ? parsed?.timestamp : undefined;

    if (
      typeof timestamp === "number" &&
      Date.now() - timestamp > STORE_PROFILE_CACHE_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(STORE_PROFILE_CACHE_STORAGE_KEY);
      return [];
    }

    if (!Array.isArray(entries)) return [];
    return entries.filter(
      (entry): entry is [SWRCacheKey, SWRCacheValue] =>
        Array.isArray(entry) &&
        typeof entry[0] === "string" &&
        entry[0].startsWith(STORE_PROFILE_SWR_PREFIX)
    );
  } catch {
    return [];
  }
}

function writePersistedEntries(map: SWRCache) {
  try {
    const storeProfileEntries: Array<[SWRCacheKey, SWRCacheValue]> = [];
    for (const key of map.keys()) {
      if (!key.startsWith(STORE_PROFILE_SWR_PREFIX)) continue;
      const value = map.get(key);
      if (typeof value === "undefined") continue;
      storeProfileEntries.push([key, value]);
    }
    window.localStorage.setItem(
      STORE_PROFILE_CACHE_STORAGE_KEY,
      JSON.stringify({ timestamp: Date.now(), entries: storeProfileEntries })
    );
  } catch {
    // localStorage can throw in private mode/quota scenarios. Fail silently.
  }
}

function localStorageProvider(): SWRCache {
  if (!canUseStorage()) {
    return new Map();
  }

  const map = new Map(readPersistedEntries()) as SWRCache;
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
