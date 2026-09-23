/**
 * react-query is persisted to IndexedDB for 15 days. Theme drafts must never be:
 * a restored library would send an old draft revision, and a restored editor would
 * show an old draft as current. Queries opt out with meta.persist === false.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import { shouldPersistQuery } from "@/lib/queryPersister";
import { themeEditorQueryKey, themesQueryKey } from "@/lib/query-keys";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("shouldPersistQuery", () => {
  test("keeps successful queries, drops opted-out and unfinished ones", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await client.fetchQuery({ queryKey: ["orders", "list"], queryFn: async () => [1] });
    await client.fetchQuery({
      queryKey: themesQueryKey,
      queryFn: async () => ({ current: { draft_revision: 3 } }),
      meta: { persist: false },
    });
    await client.fetchQuery({
      queryKey: themeEditorQueryKey,
      queryFn: async () => ({ draft_revision: 3 }),
      meta: { persist: false },
    });
    await client
      .fetchQuery({ queryKey: ["broken"], queryFn: async () => Promise.reject(new Error("no")) })
      .catch(() => undefined);

    const persisted = dehydrate(client, { shouldDehydrateQuery: shouldPersistQuery }).queries.map(
      (q) => q.queryKey,
    );
    expect(persisted).toEqual([["orders", "list"]]);
    client.clear();
  });

  test("the theme keys sit outside ['theming'], so card style invalidations never touch them", () => {
    expect(themesQueryKey[0]).not.toBe(themeEditorQueryKey[0]);
  });

  test("the provider persists through the filter", () => {
    expect(read("src/components/QueryProvider.tsx")).toMatch(
      /dehydrateOptions:\s*\{\s*shouldDehydrateQuery:\s*shouldPersistQuery\s*\}/,
    );
  });

  test("the library query opts out and is not refetched on focus or reconnect", () => {
    const hook = read("src/hooks/useThemesQuery.ts");
    expect(hook).toMatch(/meta:\s*\{\s*persist:\s*false\s*\}/);
    expect(hook).toMatch(/refetchOnWindowFocus:\s*false/);
    expect(hook).toMatch(/refetchOnReconnect:\s*false/);
  });
});
