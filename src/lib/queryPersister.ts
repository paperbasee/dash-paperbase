import { get, set, del } from "idb-keyval";
import { defaultShouldDehydrateQuery, type Query } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

export const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set("REACT_QUERY_CACHE", client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>("REACT_QUERY_CACHE");
  },
  removeClient: async () => {
    await del("REACT_QUERY_CACHE");
  },
};

/**
 * Which queries are written to IndexedDB: the default (successful ones only), minus
 * any query that opts out with `meta: { persist: false }`, such as theme drafts, whose
 * revision must never be restored from an old copy.
 */
export function shouldPersistQuery(query: Pick<Query, "state" | "meta">): boolean {
  return defaultShouldDehydrateQuery(query as Query) && query.meta?.persist !== false;
}
