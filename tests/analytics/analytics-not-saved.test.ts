/**
 * Analytics reports are never saved in the browser's storage (owner, 2026-10-03): a copy kept for
 * days would outlive the plan or the role that showed it, readable in DevTools.
 */
import { describe, expect, test, vi } from "vitest";

const seen = vi.hoisted(() => ({ options: [] as { meta?: { persist?: boolean } }[] }));
vi.mock("@tanstack/react-query", async (real) => ({
  ...(await real<typeof import("@tanstack/react-query")>()),
  useQuery: (options: { meta?: { persist?: boolean } }) => {
    seen.options.push(options);
    return {};
  },
}));

import { useLive, useSection } from "@/app/[locale]/(dashboard)/analytics/_lib/queries";
import { shouldPersistQuery } from "@/lib/queryPersister";

describe("analytics reports in the browser's storage", () => {
  test("every report, and Live, says not to be saved", () => {
    useSection("traffic", { preset: "7", compare: "previous" }, true);
    useLive(true);
    expect(seen.options).toHaveLength(2);
    for (const options of seen.options) {
      expect(options.meta).toEqual({ persist: false });
      const query = { meta: options.meta, state: { status: "success" } } as Parameters<typeof shouldPersistQuery>[0];
      expect(shouldPersistQuery(query)).toBe(false);
    }
  });
});
