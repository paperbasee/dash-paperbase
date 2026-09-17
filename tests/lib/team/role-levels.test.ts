/**
 * Role editor presets must never pick a key the role can't hold: the API
 * refuses the whole role save with a 400 if one is sent (e.g. theming.manage on
 * Staff or Viewer).
 */

import { describe, expect, test } from "vitest";

import { PERMISSION_GROUPS, type PermissionGroup } from "@/config/permissions";
import {
  applyLevel,
  availableKeys,
  levelForGroup,
  permissionsToSave,
} from "@/lib/team/role-levels";

const group = (id: string): PermissionGroup => {
  const found = PERMISSION_GROUPS.find((g) => g.id === id);
  if (!found) throw new Error(`no group ${id}`);
  return found;
};

const NONE = new Set<string>();
/** What the API sends for Staff, Viewer and custom roles today. */
const STAFF = new Set(["theming.manage"]);
const sorted = (keys: Iterable<string>) => [...keys].sort();

describe("with no unavailable keys (Admin, Manager)", () => {
  const orders = group("orders");

  test("presets select nothing, the view gate, or every key", () => {
    expect(sorted(applyLevel(orders, "none", new Set(["orders.view"]), NONE))).toEqual([]);
    expect(sorted(applyLevel(orders, "view", new Set(), NONE))).toEqual(["orders.view"]);
    expect(sorted(applyLevel(orders, "full", new Set(), NONE))).toEqual(
      sorted(orders.permissions.map((p) => p.key))
    );
    expect(sorted(applyLevel(group("theming"), "full", new Set(), NONE))).toEqual([
      "theming.manage",
      "theming.view",
    ]);
  });

  test("levels read back as none, view, full or custom", () => {
    expect(levelForGroup(orders, new Set(), NONE)).toBe("none");
    expect(levelForGroup(orders, new Set(["orders.view"]), NONE)).toBe("view");
    expect(levelForGroup(orders, applyLevel(orders, "full", new Set(), NONE), NONE)).toBe("full");
    expect(levelForGroup(orders, new Set(["orders.view", "orders.edit"]), NONE)).toBe("custom");
    expect(levelForGroup(group("theming"), new Set(["theming.view"]), NONE)).toBe("view");
  });
});

describe("Staff and Viewer on Storefront customization", () => {
  const theming = group("theming");

  test("Full selects only what the role may hold", () => {
    const next = applyLevel(theming, "full", new Set(), STAFF);
    expect(sorted(next)).toEqual(["theming.view"]);
  });

  test("the role's held keys read as view, never custom or full", () => {
    // View and Full give the same access here, like the single-key Analytics
    // group, so a Viewer role never reads "Full" on a section it can only see.
    expect(levelForGroup(theming, new Set(["theming.view"]), STAFF)).toBe("view");
    expect(levelForGroup(theming, applyLevel(theming, "full", new Set(), STAFF), STAFF)).toBe(
      "view"
    );
  });

  test("a stale unavailable key is cleared by any preset and ignored by the level", () => {
    const stale = new Set(["theming.view", "theming.manage", "orders.view"]);
    expect(levelForGroup(theming, stale, STAFF)).toBe("view");
    for (const level of ["none", "view", "full"] as const) {
      expect(applyLevel(theming, level, stale, STAFF).has("theming.manage"), level).toBe(false);
    }
  });

  test("the save payload never carries the unavailable key", () => {
    expect(sorted(permissionsToSave(["theming.manage", "orders.edit"], STAFF))).toEqual([
      "orders.edit",
      "orders.view",
      "theming.view",
    ]);
  });
});

describe("a group with several actions, one of them unavailable", () => {
  const orders = group("orders");
  const noRefund = new Set(["orders.refund"]);

  test("Full selects every other action and reads back as full, not custom", () => {
    const full = applyLevel(orders, "full", new Set(), noRefund);
    expect(full.has("orders.refund")).toBe(false);
    expect(sorted(full)).toEqual(["orders.cancel", "orders.edit", "orders.export", "orders.view"]);
    expect(levelForGroup(orders, full, noRefund)).toBe("full");
  });

  test("missing an allowed action still reads custom", () => {
    const partial = new Set(["orders.view", "orders.edit", "orders.cancel"]);
    expect(levelForGroup(orders, partial, noRefund)).toBe("custom");
  });
});

describe("an unavailable view gate", () => {
  test("takes the whole group out, since every action needs the gate", () => {
    const orders = group("orders");
    const noGate = new Set(["orders.view"]);
    expect(availableKeys(orders, noGate)).toEqual([]);
    expect(sorted(applyLevel(orders, "full", new Set(), noGate))).toEqual([]);
    expect(levelForGroup(orders, new Set(), noGate)).toBe("none");
  });
});

describe("every group, every preset", () => {
  const unavailableSets = [NONE, STAFF, new Set(["orders.refund", "team.manage_roles"])];

  test("never selects an unavailable key, leaves other groups alone, keeps input intact", () => {
    const other = new Set(["some.other_key"]);
    for (const unavailable of unavailableSets) {
      for (const g of PERMISSION_GROUPS) {
        for (const level of ["none", "view", "full"] as const) {
          const next = applyLevel(g, level, other, unavailable);
          const picked = [...next].filter((k) => unavailable.has(k));
          expect(picked, `${g.id} ${level}`).toEqual([]);
          expect(next.has("some.other_key"), `${g.id} ${level}`).toBe(true);
          expect(sorted(other)).toEqual(["some.other_key"]);
        }
      }
    }
  });

  test("a preset reads back as itself, except Full where only view is allowed", () => {
    for (const unavailable of unavailableSets) {
      for (const g of PERMISSION_GROUPS) {
        const onlyView = availableKeys(g, unavailable).length === 1;
        for (const level of ["none", "view", "full"] as const) {
          const expected = level === "full" && onlyView ? "view" : level;
          const read = levelForGroup(g, applyLevel(g, level, new Set(), unavailable), unavailable);
          expect(read, `${g.id} ${level}`).toBe(expected);
        }
      }
    }
  });
});
