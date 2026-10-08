/**
 * The shop the dashboard works in (lib/active-shop): passes carry none, so the dashboard keeps the
 * choice per person in this browser and follows what /auth/me/ says of it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { activeShop, chooseShop, followShopFromMe, forgetActiveShop } from "@/lib/active-shop";

import { storage } from "./accounts/browser";

beforeEach(() => {
  vi.stubGlobal("localStorage", storage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the shop the dashboard works in", () => {
  it("is none until chosen", () => {
    expect(activeShop("usr_1")).toBeNull();
    expect(activeShop(null)).toBeNull();
  });

  it("is kept for the person who chose it, never for the next one in this browser", () => {
    chooseShop("usr_1", "str_a");
    expect(activeShop("usr_1")).toBe("str_a");
    expect(activeShop("usr_2")).toBeNull();
  });

  it("follows /auth/me/, and says when that moved it to another shop", () => {
    expect(followShopFromMe("usr_1", "str_a")).toBe(false); // the first answer: nothing was shown yet
    expect(activeShop("usr_1")).toBe("str_a");
    expect(followShopFromMe("usr_1", "str_a")).toBe(false);
    expect(followShopFromMe("usr_1", "str_b")).toBe(true); // taken off str_a: now the one they have
    expect(activeShop("usr_1")).toBe("str_b");
    expect(followShopFromMe("usr_1", null)).toBe(false);
    expect(activeShop("usr_1")).toBe("str_b");
  });

  it("is forgotten at sign-out", () => {
    chooseShop("usr_1", "str_a");
    forgetActiveShop();
    expect(activeShop("usr_1")).toBeNull();
  });

  it("survives a broken value", () => {
    localStorage.setItem("paperbase_active_shop", "{not json");
    expect(activeShop("usr_1")).toBeNull();
  });
});
