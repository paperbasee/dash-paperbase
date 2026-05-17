import { get, set, del } from "idb-keyval";
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
