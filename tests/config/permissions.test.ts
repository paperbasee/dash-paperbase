/**
 * The dashboard's mirror of the API's permission list and its three fixed roles.
 *
 * `src/config/permissions.ts` mirrors `api-paperbase/engine/apps/rbac/catalog.py`.
 * It is UX-only -- the server re-checks every request -- but drift is still
 * user-visible: a page gated on a key the API does not know is hidden from
 * everyone but the owner, and a role card line on a missing key is never ticked.
 *
 * These tests import the real module and, when the monorepo is checked out,
 * read the API catalog off disk to catch drift.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import {
  ALL_PERMISSION_KEYS,
  APP_PAGE_PERMISSION,
  ROLE_AREAS,
  ROLE_SLUGS,
  isRoleSlug,
  roleAreas,
} from "@/config/permissions";
import { APP_CONFIG } from "@/config/apps";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** `<group>.<action>` -- the exact shape the API builds keys with. */
const KEY_SHAPE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

describe("the permission list", () => {
  test("keys are unique and shaped as the API parses them", () => {
    expect(new Set(ALL_PERMISSION_KEYS).size).toBe(ALL_PERMISSION_KEYS.length);
    expect(ALL_PERMISSION_KEYS.filter((k) => !KEY_SHAPE.test(k))).toEqual([]);
  });

  test("keys that gate nothing are gone", () => {
    // Cancelling is a change of status (orders.edit); refunds and customer downloads were never
    // built; the trash's one key split into restore and delete forever (owner, 2026-10-02).
    for (const key of ["orders.refund", "orders.cancel", "customers.export", "trash.manage"]) {
      expect(ALL_PERMISSION_KEYS).not.toContain(key);
    }
    expect(ALL_PERMISSION_KEYS).toContain("trash.restore");
    expect(ALL_PERMISSION_KEYS).toContain("trash.purge");
  });

  test("the owner's powers are no permission", () => {
    const groups = new Set(ALL_PERMISSION_KEYS.map((k) => k.slice(0, k.indexOf("."))));
    for (const power of ["domains", "couriers", "team", "billing", "payments"]) {
      expect(groups.has(power), power).toBe(false);
    }
  });
});

describe("the three fixed roles", () => {
  test("are Admin, Manager and Staff, in that order", () => {
    expect([...ROLE_SLUGS]).toEqual(["admin", "manager", "staff"]);
    expect(isRoleSlug("staff")).toBe(true);
    expect(isRoleSlug("viewer")).toBe(false);
    expect(isRoleSlug("")).toBe(false);
  });
});

describe("APP_PAGE_PERMISSION", () => {
  test("every app is real and every key is in the list", () => {
    const keys = new Set(ALL_PERMISSION_KEYS);
    for (const [appId, key] of Object.entries(APP_PAGE_PERMISSION)) {
      expect(APP_CONFIG[appId], appId).toBeDefined();
      expect(keys.has(key), `${appId} -> ${key}`).toBe(true);
    }
  });

  test("a page shows to whoever can change it, apart from the lists and reports", () => {
    // Read-only by design: lists nobody changes, reports, and the product list Staff sell from.
    const readOnly = new Set(["analytics", "products", "orders", "abandoned_checkouts", "customers", "accounts", "wishlist"]);
    for (const [appId, key] of Object.entries(APP_PAGE_PERMISSION)) {
      if (readOnly.has(appId)) continue;
      expect(key.endsWith(".view"), `${appId} is gated on a read key (${key})`).toBe(false);
    }
  });
});

describe("roleAreas -- the role cards", () => {
  const staffLike = new Set(["orders.view", "orders.edit", "products.view", "support.view", "support.manage"]);

  test("every line names a real key", () => {
    const keys = new Set(ALL_PERMISSION_KEYS);
    for (const area of ROLE_AREAS) {
      expect(keys.has(area.key), area.labelKey).toBe(true);
      if (area.unlessHolding) expect(keys.has(area.unlessHolding), area.labelKey).toBe(true);
    }
  });

  test("ticks what a role holds and crosses out the rest", () => {
    const { can, cannot } = roleAreas(staffLike);
    expect(can.map((a) => a.labelKey)).toEqual(["areaOrders", "areaCatalogSee", "areaSupport"]);
    expect(cannot.map((a) => a.labelKey)).toContain("areaCatalog");
    expect(cannot.map((a) => a.labelKey)).toContain("areaSettings");
    // "See the products" is never a line a role is told it can't do.
    expect(cannot.map((a) => a.labelKey)).not.toContain("areaCatalogSee");
  });

  test("leaves out a narrower line a role's wider one covers", () => {
    const { can, cannot } = roleAreas(new Set(ALL_PERMISSION_KEYS));
    expect(can.map((a) => a.labelKey)).not.toContain("areaCatalogSee");
    expect(cannot).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// CROSS-REPO DRIFT: compare against api-paperbase/engine/apps/rbac/catalog.py
// ---------------------------------------------------------------------------

const API_CATALOG_PATHS = [
  path.resolve(HERE, "../../../api-paperbase/engine/apps/rbac/catalog.py"),
];

function readApiCatalog(): string | null {
  for (const p of API_CATALOG_PATHS) {
    try {
      return readFileSync(p, "utf8");
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** The keys (in order) and the role slugs catalog.py declares. */
function parseApiCatalog(src: string): { keys: string[]; calls: number; roles: string[] } {
  const keys = [...src.matchAll(/_p\(\s*"([^"]+)"\s*,\s*"[^"]*"/g)].map((m) => m[1]);
  const calls = src.match(/_p\(\s*"/g)?.length ?? 0;
  const rolesBlock = /ROLES:\s*dict\[str,\s*Role\]\s*=\s*\{([\s\S]*?)\n\}/.exec(src);
  const roles = rolesBlock ? [...rolesBlock[1].matchAll(/^\s{4}"(\w+)":\s*Role\(/gm)].map((m) => m[1]) : [];
  return { keys, calls, roles };
}

const apiSource = readApiCatalog();
const api = apiSource ? parseApiCatalog(apiSource) : null;

// Skips (rather than fails) when this repo is checked out on its own.
describe.skipIf(api === null)("cross-repo drift against engine/apps/rbac/catalog.py", () => {
  test("the parse found the whole API catalog (guards a silent regex break)", () => {
    expect(api!.calls).toBeGreaterThan(30);
    expect(api!.keys.length).toBe(api!.calls);
  });

  test("the dashboard lists exactly the API's keys, in its order", () => {
    expect([...ALL_PERMISSION_KEYS]).toEqual(api!.keys);
  });

  test("the dashboard knows exactly the API's roles", () => {
    expect([...ROLE_SLUGS]).toEqual(api!.roles);
  });
});
