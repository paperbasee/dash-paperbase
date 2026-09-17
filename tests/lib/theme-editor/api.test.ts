/**
 * The Customization page's calls must send exactly what the API validates
 * (expected_draft_revision is required, a whole number), and every refusal the API
 * documents must map to a message the merchant can act on, not a raw English detail.
 */

import { describe, expect, test } from "vitest";

import en from "../../../messages/en.json";
import bn from "../../../messages/bn.json";
import {
  discardThemeDraft,
  fetchThemeLibrary,
  selectTheme,
  themeErrorMessageKey,
  type ThemeHttp,
} from "@/lib/theme-editor/api";

function fakeHttp(answer: unknown) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const http: ThemeHttp = {
    async get<T>(path: string) {
      calls.push({ method: "GET", path });
      return { data: answer as T };
    },
    async post<T>(path: string, body?: unknown) {
      calls.push({ method: "POST", path, body });
      return { data: answer as T };
    },
  };
  return { http, calls };
}

/** The shape of the dashboard's ApiHttpError: a status and the parsed body. */
const httpError = (status: number, data: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { status, data });

describe("fetchers", () => {
  test("the library is GET theming/themes/", async () => {
    const { http, calls } = fakeHttp({ themes: [] });
    await expect(fetchThemeLibrary(http)).resolves.toEqual({ themes: [] });
    expect(calls).toEqual([{ method: "GET", path: "theming/themes/" }]);
  });

  test("select sends the theme and the draft revision the page holds", async () => {
    const { http, calls } = fakeHttp({ theme_key: "basic" });
    await selectTheme(http, "minimal", 7);
    expect(calls).toEqual([
      {
        method: "POST",
        path: "theming/editor/select/",
        body: { theme_key: "minimal", expected_draft_revision: 7 },
      },
    ]);
  });

  test("discard sends the draft revision, including 0", async () => {
    const { http, calls } = fakeHttp({});
    await discardThemeDraft(http, 0);
    expect(calls).toEqual([
      { method: "POST", path: "theming/editor/discard/", body: { expected_draft_revision: 0 } },
    ]);
  });
});

describe("themeErrorMessageKey", () => {
  test.each([
    [409, { code: "draft_conflict", draft_revision: 9 }, "errorDraftConflict"],
    [403, { code: "not_entitled" }, "lockNotEntitledTitle"],
    [403, { code: "storefront_unavailable", reason: "payment_pending" }, "lockPaymentPending"],
    [403, { code: "storefront_unavailable", reason: "expired" }, "lockExpired"],
    [403, { code: "storefront_unavailable", reason: null }, "lockExpired"],
    [403, { detail: "You do not have permission to perform this action." }, "errorNoPermission"],
    [400, { code: "unknown_theme" }, "errorUnknownTheme"],
    [400, { code: "invalid_document", path: "sections" }, "errorGeneric"],
    [409, { detail: "other conflict" }, "errorGeneric"],
    [500, "<html>", "errorGeneric"],
  ])("%i %j -> %s", (status, data, key) => {
    expect(themeErrorMessageKey(httpError(status, data))).toBe(key);
  });

  test("a network failure or anything else is the generic message", () => {
    expect(themeErrorMessageKey(new TypeError("Failed to fetch"))).toBe("errorGeneric");
    expect(themeErrorMessageKey(null)).toBe("errorGeneric");
    expect(themeErrorMessageKey(undefined)).toBe("errorGeneric");
  });

  test("every key it can return exists in English and Bangla", () => {
    const keys = [
      "errorDraftConflict",
      "errorNoPermission",
      "errorUnknownTheme",
      "errorGeneric",
      "lockNotEntitledTitle",
      "lockPaymentPending",
      "lockExpired",
    ];
    const enNs = (en as Record<string, any>).settings.customization;
    const bnNs = (bn as Record<string, any>).settings.customization;
    expect(keys.filter((k) => typeof enNs[k] !== "string" || typeof bnNs[k] !== "string")).toEqual([]);
  });
});
