/**
 * The shop's "when a sale counts" choice: the calls must use the path and the
 * field the API reads, anything unknown must read as the default, and every
 * word the block draws must exist in both languages.
 */

import { describe, expect, test } from "vitest";

import en from "../../../messages/en.json";
import bn from "../../../messages/bn.json";
import {
  PURCHASE_TIMINGS,
  PURCHASE_TIMING_PATH,
  asPurchaseTiming,
  fetchPurchaseTiming,
  savePurchaseTiming,
} from "@/lib/marketing/purchase-timing";

function fakeHttp(answer: unknown) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const http = {
    async get<T>(path: string) {
      calls.push({ method: "GET", path });
      return { data: answer as T };
    },
    async patch<T>(path: string, body: unknown) {
      calls.push({ method: "PATCH", path, body });
      return { data: answer as T };
    },
  };
  return { http, calls };
}

describe("purchase timing calls", () => {
  test("reads the shop's choice from the purchase-timing path", async () => {
    const { http, calls } = fakeHttp({ cod_purchase_trigger: "confirmation" });
    await expect(fetchPurchaseTiming(http)).resolves.toBe("confirmation");
    expect(calls).toEqual([{ method: "GET", path: PURCHASE_TIMING_PATH }]);
  });

  test("saves the choice under the field the API reads, and returns what it kept", async () => {
    const { http, calls } = fakeHttp({ cod_purchase_trigger: "confirmation" });
    await expect(savePurchaseTiming(http, "confirmation")).resolves.toBe("confirmation");
    expect(calls).toEqual([
      { method: "PATCH", path: PURCHASE_TIMING_PATH, body: { cod_purchase_trigger: "confirmation" } },
    ]);
  });

  test("anything the API does not name reads as placement, never as confirmation", () => {
    expect(asPurchaseTiming("confirmation")).toBe("confirmation");
    expect(asPurchaseTiming("placement")).toBe("placement");
    for (const odd of [undefined, null, "", "CONFIRMATION", 1, {}]) {
      expect(asPurchaseTiming(odd)).toBe("placement");
    }
  });
});

describe("purchase timing words", () => {
  const keys = [
    "title",
    "intro",
    ...PURCHASE_TIMINGS.flatMap((timing) => [timing, `${timing}Note`]),
    "confirmationLate",
    "confirmationGoal",
    "prepaidNote",
    "askToChange",
    "saving",
  ];

  test.each([
    ["en", en],
    ["bn", bn],
  ])("%s has every word the block draws", (_locale, messages) => {
    const words = (messages.settings.marketing as Record<string, unknown>).purchaseTiming as Record<string, string>;
    for (const key of keys) {
      expect(words[key], key).toBeTruthy();
    }
  });

  test("the block says it covers Meta and TikTok together", () => {
    const words = en.settings.marketing.purchaseTiming;
    expect(words.intro).toContain("Meta");
    expect(words.intro).toContain("TikTok");
  });
});
