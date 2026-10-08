/**
 * The dashboard's own places in search (owner, 2026-09-29; src/lib/search/places.ts): pages,
 * settings sections, analytics sections, theme editor pages and actions, found as the merchant
 * types, and shown only to someone who could open them.
 */
import { describe, expect, test } from "vitest";

import { accountPageUrl } from "@/lib/accounts/config";
import {
  SEARCH_PLACES,
  compactText,
  findPlaces,
  placeLabel,
  visiblePlaces,
  type PlaceAccess,
  type SearchPlace,
} from "@/lib/search/places";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

type Messages = Record<string, unknown>;

function lookup(messages: Messages, key: string): string | undefined {
  const found = key.split(".").reduce<unknown>(
    (node, part) => (node && typeof node === "object" ? (node as Messages)[part] : undefined),
    messages,
  );
  return typeof found === "string" ? found : undefined;
}

const labelIn = (messages: Messages) => (place: SearchPlace) =>
  placeLabel(place, (key) => lookup(messages, key) ?? key);

const EVERYONE: PlaceAccess = {
  canShowApp: () => true,
  has: () => true,
  settingsSections: new Set(["store", "policies", "customization", "promotions", "checkout", "shipping", "eav", "apps", "integrations", "domains", "notifications", "team", "sessions", "billing"]),
  inSupportMode: false,
};

const ids = (places: SearchPlace[]) => places.map((place) => place.id);

function find(query: string, messages: Messages = en, access: PlaceAccess = EVERYONE, limit = 10) {
  return ids(findPlaces(query, visiblePlaces(access), labelIn(messages), limit));
}

describe("every place", () => {
  test("is named by words both languages have", () => {
    for (const place of SEARCH_PLACES) {
      for (const key of place.label.keys) {
        expect(lookup(en, key), `${place.id}: en ${key}`).toBeTruthy();
        expect(lookup(bn, key), `${place.id}: bn ${key}`).toBeTruthy();
      }
    }
  });

  test("has its own id", () => {
    expect(new Set(ids([...SEARCH_PLACES])).size).toBe(SEARCH_PLACES.length);
  });
});

describe("who sees what", () => {
  test("someone who may open nothing finds only Home and their own Paperbase account", () => {
    const nobody: PlaceAccess = { canShowApp: () => false, has: () => false, settingsSections: new Set(), inSupportMode: false };
    expect(ids(visiblePlaces(nobody))).toEqual(["page:home", "account"]);
  });

  test("Paperbase support, signed in as the owner, never finds the owner's own account", () => {
    expect(ids(visiblePlaces({ ...EVERYONE, inSupportMode: true }))).not.toContain("account");
  });

  test("seeing products is not adding them", () => {
    const viewer: PlaceAccess = {
      canShowApp: (app) => app === "products",
      has: (key) => key === "products.view",
      settingsSections: new Set(),
      inSupportMode: false,
    };
    expect(find("product", en, viewer)).toContain("page:products");
    expect(find("add product", en, viewer)).not.toContain("action:add-product");
  });

  test("a settings section follows the sections the person sees", () => {
    const noIntegrations: PlaceAccess = { ...EVERYONE, settingsSections: new Set(["store"]) };
    expect(find("steadfast", en, noIntegrations)).toEqual([]);
    expect(find("steadfast")).toEqual(["settings:integrations"]);
  });
});

describe("finding", () => {
  test("by everyday words, in English or Bangla, whatever the dashboard's language", () => {
    expect(find("steadfast")).toContain("settings:integrations");
    expect(find("কুরিয়ার", en)).toContain("settings:integrations");
    expect(find("courier", bn)).toContain("settings:integrations");
    expect(find("delivery charge")).toContain("settings:shipping");
    expect(find("logo")).toContain("settings:store");
    expect(find("স্টক")).toContain("page:inventory");
  });

  test("marks and case do not matter", () => {
    expect(compactText("Store-Info")).toBe(compactText("store info"));
    expect(find("STORE-INFO")[0]).toBe("settings:store");
  });

  test("a name that starts with the words comes first", () => {
    expect(find("orders")[0]).toBe("page:orders");
  });

  test("the theme editor's pages and the analytics sections are places too", () => {
    expect(find("checkout")).toEqual(expect.arrayContaining(["editor:checkout", "settings:checkout"]));
    expect(find("districts")).toContain("analytics:districts");
  });

  test("actions are found by what they do", () => {
    expect(find("add product")).toContain("action:add-product");
    expect(find("new order")).toContain("action:add-order");
  });

  test("a person's name, phone and passkeys are found in Your Paperbase account, at Accounts", () => {
    // Settings > Account and Security left the dashboard (owner, 2026-10-09).
    for (const words of ["passkey", "my account", "profile", "পাসকি", "আমার অ্যাকাউন্ট"]) {
      expect(find(words), words).toContain("account");
    }
    const account = SEARCH_PLACES.find((place) => place.id === "account")!;
    expect(account.external).toBe(true);
    expect(account.href).toBe(accountPageUrl());
    expect(ids([...SEARCH_PLACES])).not.toContain("settings:account");
    expect(ids([...SEARCH_PLACES])).not.toContain("settings:security");
  });

  test("one letter finds nothing -- it would find half the dashboard", () => {
    expect(find("o")).toEqual([]);
  });
});
