/**
 * The Customization page's calls must send exactly what the API validates
 * (expected_draft_revision is required, a whole number), and every refusal the API
 * documents must map to a message the merchant can act on, not a raw English detail.
 */

import { describe, expect, test } from "vitest";

import en from "../../../messages/en.json";
import bn from "../../../messages/bn.json";
import {
  apiErrorParts,
  discardThemeDraft,
  EDITOR_REQUEST_TIMEOUT_MS,
  fetchThemeEditor,
  fetchThemeLibrary,
  mintPreviewPass,
  publishThemeDraft,
  saveThemeDraft,
  themeErrorMessageKey,
  type ThemeDocument,
  type ThemeHttp,
} from "@/lib/theme-editor/api";

function fakeHttp(answer: unknown) {
  const calls: { method: string; path: string; body?: unknown; config?: unknown }[] = [];
  const http: ThemeHttp = {
    async get<T>(path: string) {
      calls.push({ method: "GET", path });
      return { data: answer as T };
    },
    async post<T>(path: string, body?: unknown, config?: unknown) {
      calls.push({ method: "POST", path, body, ...(config ? { config } : {}) });
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

  test("the editor opens with GET theming/editor/", async () => {
    const { http, calls } = fakeHttp({ draft_revision: 3 });
    await expect(fetchThemeEditor(http)).resolves.toEqual({ draft_revision: 3 });
    expect(calls).toEqual([{ method: "GET", path: "theming/editor/" }]);
  });

  test("discard sends the draft revision, including 0", async () => {
    const { http, calls } = fakeHttp({});
    await discardThemeDraft(http, 0);
    expect(calls).toEqual([
      { method: "POST", path: "theming/editor/discard/", body: { expected_draft_revision: 0 } },
    ]);
  });
});

describe("draft and preview pass", () => {
  test("the draft is PUT with the document and the revision it was made on, and a timeout", async () => {
    const calls: unknown[] = [];
    const http = {
      async put<T>(path: string, body?: unknown, config?: unknown) {
        calls.push({ method: "PUT", path, body, config });
        return { data: { draft_revision: 8, preview_version: "abc123def456" } as T };
      },
    };
    const doc = { theme: "basic" } as ThemeDocument;
    await expect(saveThemeDraft(http, doc, 7)).resolves.toEqual({
      draft_revision: 8,
      preview_version: "abc123def456",
    });
    expect(calls).toEqual([
      {
        method: "PUT",
        path: "theming/editor/draft/",
        body: { document: doc, expected_draft_revision: 7 },
        config: { timeout: EDITOR_REQUEST_TIMEOUT_MS },
      },
    ]);
  });

  test("a pass is minted with an empty POST, and a timeout", async () => {
    const { http, calls } = fakeHttp({ preview_pass: "secret", expires_at: "x", store_public_id: "str_1" });
    await mintPreviewPass(http);
    expect(calls).toEqual([
      { method: "POST", path: "theming/preview/pass/", body: undefined, config: { timeout: EDITOR_REQUEST_TIMEOUT_MS } },
    ]);
  });

  test("publishing sends the revision the editor holds, and nothing else", async () => {
    const { http, calls } = fakeHttp({ revision: 4, draft_revision: 7, preview_version: "v" });
    await expect(publishThemeDraft(http, 6)).resolves.toMatchObject({ revision: 4 });
    expect(calls).toEqual([
      { method: "POST", path: "theming/editor/publish/", body: { expected_draft_revision: 6 } },
    ]);
  });

  test("apiErrorParts reads the status, code, path and draft revision, and nothing that isn't there", () => {
    expect(
      apiErrorParts(httpError(400, { code: "invalid_document", path: "templates.home.sections[1]" })),
    ).toEqual({
      status: 400,
      code: "invalid_document",
      path: "templates.home.sections[1]",
      draftRevision: undefined,
    });
    // A clash carries where the draft stands now, so the editor can offer to save over it.
    expect(apiErrorParts(httpError(409, { code: "draft_conflict", draft_revision: 30 }))).toMatchObject({
      status: 409,
      code: "draft_conflict",
      draftRevision: 30,
    });
    expect(apiErrorParts(httpError(409, { code: "draft_conflict", draft_revision: "30" })).draftRevision).toBe(
      undefined,
    );
    expect(apiErrorParts(httpError(502, "<html>"))).toEqual({
      status: 502,
      code: undefined,
      path: undefined,
      draftRevision: undefined,
    });
    expect(apiErrorParts(new TypeError("Failed to fetch")).status).toBe(undefined);
    expect(apiErrorParts(null).status).toBe(undefined);
  });
});

describe("themeErrorMessageKey", () => {
  test.each([
    [409, { code: "draft_conflict", draft_revision: 9 }, "errorDraftConflict"],
    [403, { code: "not_entitled" }, "lockNotEntitledBody"],
    [403, { code: "storefront_unavailable", reason: "payment_pending" }, "lockPaymentPending"],
    [403, { code: "storefront_unavailable", reason: "expired" }, "lockExpired"],
    [403, { code: "storefront_unavailable", reason: null }, "lockExpired"],
    [403, { detail: "You do not have permission to perform this action." }, "errorNoPermission"],
    [400, { code: "unknown_theme" }, "errorUnknownTheme"],
    [400, { code: "nothing_to_publish" }, "errorNothingToSave"],
    [400, { code: "invalid_document", path: "templates.home.sections[1]" }, "errorInvalidDocument"],
    [429, { detail: "Request was throttled." }, "errorTooManySaves"],
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
      "errorNothingToSave",
      "errorInvalidDocument",
      "errorTooManySaves",
      "errorGeneric",
      "lockNotEntitledBody",
      "lockPaymentPending",
      "lockExpired",
    ];
    const enNs = (en as Record<string, any>).settings.customization;
    const bnNs = (bn as Record<string, any>).settings.customization;
    expect(keys.filter((k) => typeof enNs[k] !== "string" || typeof bnNs[k] !== "string")).toEqual([]);
  });
});
