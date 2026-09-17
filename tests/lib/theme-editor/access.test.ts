/**
 * What the Customization page offers, from the API's access block. Editing needs
 * BOTH an unlocked shop and a member who may edit; a locked shop shows its lock
 * whoever is looking, and an unknown state locks rather than opens.
 */

import { describe, expect, test } from "vitest";

import type { ThemeAccess } from "@/lib/theme-editor/api";
import { themePageState } from "@/lib/theme-editor/access";

const access = (over: Partial<ThemeAccess>): ThemeAccess => ({
  state: "ok",
  reason: null,
  can_edit: true,
  ...over,
});

describe("themePageState", () => {
  test("Premium, and a member who may edit (owner, Admin, Manager)", () => {
    expect(themePageState(access({}))).toEqual({ lock: null, canEdit: true, readOnly: false });
  });

  test("Premium, and a member who may only view (Viewer)", () => {
    expect(themePageState(access({ can_edit: false }))).toEqual({
      lock: null,
      canEdit: false,
      readOnly: true,
    });
  });

  test.each([
    [{ state: "not_entitled" }, "not_entitled"],
    [{ state: "storefront_unavailable", reason: "payment_pending" }, "payment_pending"],
    [{ state: "storefront_unavailable", reason: "expired" }, "expired"],
    [{ state: "storefront_unavailable", reason: null }, "expired"],
  ] as [Partial<ThemeAccess>, string][])("%j locks as %s for every member", (over, lock) => {
    for (const can_edit of [true, false]) {
      expect(themePageState(access({ ...over, can_edit }))).toEqual({
        lock,
        canEdit: false,
        readOnly: false,
      });
    }
  });

  test("a state this dashboard does not know locks", () => {
    const state = themePageState(access({ state: "suspended" as ThemeAccess["state"] }));
    expect(state.canEdit).toBe(false);
    expect(state.lock).not.toBeNull();
  });
});
