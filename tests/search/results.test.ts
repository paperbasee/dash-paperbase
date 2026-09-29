/**
 * The search box's list and its recent searches (owner, 2026-09-29; src/lib/search/results.ts).
 */
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  SERVER_KINDS,
  clearRecentSearches,
  hrefFor,
  normalizeResults,
  readRecentSearches,
  rememberSearch,
} from "@/lib/search/results";

describe("where a result opens", () => {
  test("things with a page open it; the rest open their list on the one found", () => {
    const item = { public_id: "x_1", title: "X" };
    expect(hrefFor("products", item)).toBe("/products/x_1");
    expect(hrefFor("orders", item)).toBe("/orders/x_1");
    expect(hrefFor("customers", item)).toBe("/customers/x_1");
    expect(hrefFor("tickets", item)).toBe("/support-tickets/x_1");
    expect(hrefFor("posts", item)).toBe("/blog/x_1");
    expect(hrefFor("categories", item)).toBe("/categories?open=x_1");
    expect(hrefFor("brands", item)).toBe("/brands?open=x_1");
    expect(hrefFor("coupons", item)).toBe("/coupons?open=x_1");
    expect(hrefFor("team", item)).toBe("/settings?tab=team");
  });

  test("a review opens the tab it is under", () => {
    expect(hrefFor("reviews", { public_id: "rv_1", title: "Nadia", status: "published" })).toBe(
      "/reviews?tab=published&open=rv_1",
    );
    expect(hrefFor("reviews", { public_id: "rv_1", title: "Nadia" })).toBe("/reviews?tab=pending&open=rv_1");
  });

  test("every kind has somewhere to go", () => {
    for (const kind of SERVER_KINDS) {
      expect(hrefFor(kind, { public_id: "a", title: "a" })).toMatch(/^\//);
    }
  });
});

test("a kind the server left out is empty, not missing", () => {
  const results = normalizeResults({ products: [{ public_id: "p", title: "P" }] });
  expect(results.products).toHaveLength(1);
  for (const kind of SERVER_KINDS.filter((k) => k !== "products")) {
    expect(results[kind]).toEqual([]);
  }
});

describe("recent searches", () => {
  const store = new Map<string, string>();
  const original = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    store.clear();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    };
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = original;
  });

  test("newest first, each once, at most six", () => {
    for (const q of ["one", "two", "three", "four", "five", "six", "seven"]) rememberSearch("str_a", q);
    rememberSearch("str_a", "THREE");
    expect(readRecentSearches("str_a")).toEqual(["THREE", "seven", "six", "five", "four", "two"]);
  });

  test("one letter is not kept", () => {
    rememberSearch("str_a", "x");
    expect(readRecentSearches("str_a")).toEqual([]);
  });

  test("each shop keeps its own, and Clear forgets them", () => {
    rememberSearch("str_a", "rahim");
    expect(readRecentSearches("str_b")).toEqual([]);
    clearRecentSearches("str_a");
    expect(readRecentSearches("str_a")).toEqual([]);
  });

  test("storage that refuses just means no list", () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    };
    expect(readRecentSearches("str_a")).toEqual([]);
    expect(() => rememberSearch("str_a", "rahim")).not.toThrow();
    expect(() => clearRecentSearches("str_a")).not.toThrow();
  });
});
