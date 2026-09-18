/**
 * Strict regression tests for the dashboard's RBAC catalog mirror.
 *
 * `src/config/permissions.ts` is a *client mirror* of the server catalog at
 * `api-paperbase/engine/apps/rbac/catalog.py`. It is UX-only — the server
 * re-checks every request — but drift is still user-visible in two ways:
 *
 *   1. A key offered here that the API does not know is a checkbox that does
 *      nothing, and `POST /roles/` rejects the whole payload (the API's
 *      `validate_keys` raises on unknown keys), so the role save fails.
 *   2. A key the API knows but this file omits is a permission merchants can
 *      never grant from the UI.
 *
 * These tests import the real module (no reimplementation) and, when the
 * monorepo is checked out, read the API catalog off disk to catch drift.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import {
  ALL_PERMISSION_KEYS,
  APP_VIEW_PERMISSION,
  PERMISSION_GROUPS,
  expandPermissionKeys,
} from "@/config/permissions";
import { APP_CONFIG } from "@/config/apps";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** `<group>.<action>` — the exact shape the API builds keys with (`key.split(".", 1)`). */
const KEY_SHAPE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

/** A message name under `settings.team`: camelCase, no dots, no spaces. */
const KEY_NAME_SHAPE = /^[a-z][A-Za-z0-9]*$/;

const groupOf = (key: string) => key.slice(0, key.indexOf("."));

// ---------------------------------------------------------------------------
// Structural integrity of the catalog itself
// ---------------------------------------------------------------------------

describe("PERMISSION_GROUPS structure", () => {
  test("group ids are unique", () => {
    const ids = PERMISSION_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("permission keys are globally unique across every group", () => {
    const keys = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
    const seen = new Set<string>();
    const duplicated = keys.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
    expect(duplicated).toEqual([]);
  });

  test("every key has the <group>.<action> shape the API parses", () => {
    const malformed = ALL_PERMISSION_KEYS.filter((k) => !KEY_SHAPE.test(k));
    expect(malformed).toEqual([]);
  });

  test("every key is prefixed with the id of the group that holds it", () => {
    const mismatched = PERMISSION_GROUPS.flatMap((g) =>
      g.permissions.filter((p) => groupOf(p.key) !== g.id).map((p) => `${g.id}:${p.key}`)
    );
    expect(mismatched).toEqual([]);
  });

  test("no group or permission ships an empty labelKey", () => {
    const blank: string[] = [];
    for (const g of PERMISSION_GROUPS) {
      if (g.labelKey.trim() === "") blank.push(`group:${g.id}`);
      for (const p of g.permissions) {
        if (p.labelKey.trim() === "") blank.push(`perm:${p.key}`);
      }
    }
    expect(blank).toEqual([]);
  });

  test("every labelKey is a bare name under settings.team, never a sentence", () => {
    // These are message keys, not words: the editor renders each with
    // t(labelKey) inside the `settings.team` namespace. An English label left
    // here by mistake, or a key written with its full path, both reach the
    // merchant as raw text — next-intl answers a key it cannot find with the
    // key itself. tests/settings/team-copy.test.ts checks each one resolves.
    const malformed: string[] = [];
    for (const g of PERMISSION_GROUPS) {
      if (!KEY_NAME_SHAPE.test(g.labelKey)) malformed.push(`group:${g.id}`);
      for (const p of g.permissions) {
        if (!KEY_NAME_SHAPE.test(p.labelKey)) malformed.push(`perm:${p.key}`);
      }
    }
    expect(malformed).toEqual([]);
  });

  test("no two entries share a labelKey", () => {
    // A duplicate would silently print one permission's name on another row.
    const keys = PERMISSION_GROUPS.flatMap((g) => [
      g.labelKey,
      ...g.permissions.map((p) => p.labelKey),
    ]);
    const seen = new Set<string>();
    const duplicated = keys.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
    expect(duplicated).toEqual([]);
  });

  test("no group is empty", () => {
    const empty = PERMISSION_GROUPS.filter((g) => g.permissions.length === 0).map((g) => g.id);
    expect(empty).toEqual([]);
  });

  test("the first permission of every group is that group's .view gate", () => {
    // Load-bearing: RoleEditorDialog reads `group.permissions[0].key` as the
    // view gate (toggling a group, and deciding whether the editor may grant
    // the group at all). A group whose [0] is not `<id>.view` would silently
    // check the wrong box and gate the row on a non-view permission.
    const gates = PERMISSION_GROUPS.map((g) => g.permissions[0]?.key);
    expect(gates).toEqual(PERMISSION_GROUPS.map((g) => `${g.id}.view`));
  });

  test("each group declares exactly one .view key", () => {
    for (const g of PERMISSION_GROUPS) {
      const views = g.permissions.filter((p) => p.key.endsWith(".view"));
      expect(views.map((p) => p.key), `group ${g.id}`).toEqual([`${g.id}.view`]);
    }
  });

  test("ALL_PERMISSION_KEYS is exactly the flattened group keys, in order", () => {
    expect(ALL_PERMISSION_KEYS).toEqual(
      PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key))
    );
    expect(new Set(ALL_PERMISSION_KEYS).size).toBe(ALL_PERMISSION_KEYS.length);
  });
});

// ---------------------------------------------------------------------------
// REGRESSION: the Networking section (storefront API keys) was removed
// ---------------------------------------------------------------------------

describe("removed api_keys group", () => {
  test("no api_keys.* permission is offered anywhere in the editor", () => {
    // The dashboard's Settings → Networking section was removed during the
    // host-routing pivot: merchants no longer manage storefront publishable
    // keys by hand. The *server* catalog still defines api_keys.view /
    // api_keys.manage (it must, for existing role rows), so the only thing
    // stopping the role editor from rendering dead checkboxes for a section
    // that no longer exists is this file. If someone "re-syncs" the mirror by
    // copying catalog.py wholesale, api_keys comes back — this test is the
    // trip-wire for that.
    const offending = ALL_PERMISSION_KEYS.filter((k) => k.startsWith("api_keys."));
    expect(offending).toEqual([]);
    expect(PERMISSION_GROUPS.some((g) => g.id === "api_keys")).toBe(false);
    expect(Object.values(APP_VIEW_PERMISSION).some((k) => k.startsWith("api_keys."))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// expandPermissionKeys — mirrors the server's requires-closure
// ---------------------------------------------------------------------------

describe("expandPermissionKeys", () => {
  test("pulls in the group's view key for every non-view permission", () => {
    expect([...expandPermissionKeys(["orders.refund"])].sort()).toEqual([
      "orders.refund",
      "orders.view",
    ]);
    expect([...expandPermissionKeys(["team.manage_roles"])].sort()).toEqual([
      "team.manage_roles",
      "team.view",
    ]);
  });

  test("leaves a bare .view key alone", () => {
    expect([...expandPermissionKeys(["analytics.view"])]).toEqual(["analytics.view"]);
  });

  test("never grants a permission outside the selected key's own group", () => {
    // Privilege bleed check: picking anything in Orders must not hand out
    // Products, Billing or Team keys.
    for (const key of ALL_PERMISSION_KEYS) {
      const group = groupOf(key);
      const leaked = [...expandPermissionKeys([key])].filter((k) => groupOf(k) !== group);
      expect(leaked, `expanding ${key}`).toEqual([]);
    }
  });

  test("the whole catalog is already closed (expansion is a fixed point)", () => {
    const expanded = expandPermissionKeys(ALL_PERMISSION_KEYS);
    expect([...expanded].sort()).toEqual([...ALL_PERMISSION_KEYS].sort());
  });

  test("expanding any subset of offered keys yields only keys the API knows", () => {
    // RoleEditorDialog POSTs `permissionsToSave(selected, unavailable)`, which
    // expands the keys this way and then drops the role's unavailable ones; the
    // API 400s the whole role save if a single key is unknown. So the expansion
    // of any UI-reachable selection must stay inside the offered key set.
    const catalog = new Set(ALL_PERMISSION_KEYS);
    for (let i = 0; i < ALL_PERMISSION_KEYS.length; i++) {
      const subset = ALL_PERMISSION_KEYS.filter((_, j) => (j + i) % 3 === 0);
      for (const k of expandPermissionKeys(subset)) {
        expect(catalog.has(k), `${k} (from subset seeded at ${i})`).toBe(true);
      }
    }
  });

  test("is order-insensitive, de-duplicates, and does not mutate its input", () => {
    const input = new Set(["orders.export", "orders.view", "orders.export"]);
    const a = expandPermissionKeys(input);
    const b = expandPermissionKeys(["orders.view", "orders.export"]);
    expect([...a].sort()).toEqual([...b].sort());
    expect([...a].sort()).toEqual(["orders.export", "orders.view"]);
    expect([...input]).toEqual(["orders.export", "orders.view"]);
    expect(a).not.toBe(input);
  });

  test("returns an empty set for an empty selection", () => {
    expect(expandPermissionKeys([]).size).toBe(0);
    expect(expandPermissionKeys(new Set()).size).toBe(0);
  });

  test("preserves keys it does not recognise instead of dropping them", () => {
    // CURRENT BEHAVIOUR, asserted deliberately (see notes). The function does
    // no validation: a role row that still carries a server-side key this UI
    // no longer renders (e.g. api_keys.view on a legacy role) survives a save
    // from the editor rather than being silently revoked. The server is the
    // validator — `validate_keys` rejects genuinely unknown keys.
    expect([...expandPermissionKeys(["api_keys.manage"])].sort()).toEqual([
      "api_keys.manage",
      "api_keys.view",
    ]);
  });

  test("handles malformed keys without throwing (current, unvalidated behaviour)", () => {
    // CURRENT BEHAVIOUR, not an endorsement: `key.split(".", 1)[0]` returns the
    // whole string when there is no dot, so a dotless token invents a
    // `<token>.view`, and "" invents ".view". Neither is reachable from the UI
    // (checkboxes only emit catalog keys) and both are rejected server-side,
    // but pin the behaviour so a refactor of the split does not start throwing
    // inside a React render.
    expect([...expandPermissionKeys(["orders"])].sort()).toEqual(["orders", "orders.view"]);
    expect([...expandPermissionKeys([""])].sort()).toEqual(["", ".view"]);
    expect([...expandPermissionKeys(["a.b.c"])].sort()).toEqual(["a.b.c", "a.view"]);
  });
});

// ---------------------------------------------------------------------------
// APP_VIEW_PERMISSION — sidebar gating
// ---------------------------------------------------------------------------

describe("APP_VIEW_PERMISSION", () => {
  test("every mapped key is a real catalog key and is a .view gate", () => {
    const catalog = new Set(ALL_PERMISSION_KEYS);
    for (const [appId, key] of Object.entries(APP_VIEW_PERMISSION)) {
      expect(catalog.has(key), `${appId} → ${key}`).toBe(true);
      expect(key.endsWith(".view"), `${appId} → ${key}`).toBe(true);
    }
  });

  test("every gated app id is a real app in config/apps.ts", () => {
    // A typo'd app id here is a permanently-ungated sidebar item:
    // PermissionsContext.canViewApp returns true for any id it can't find.
    const unknown = Object.keys(APP_VIEW_PERMISSION).filter((id) => !(id in APP_CONFIG));
    expect(unknown).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// CROSS-REPO DRIFT: compare against api-paperbase/engine/apps/rbac/catalog.py
// ---------------------------------------------------------------------------

const API_CATALOG_PATHS = [
  path.resolve(HERE, "../../../api-paperbase/engine/apps/rbac/catalog.py"),
  "/home/mahi/Paperbase/api-paperbase/engine/apps/rbac/catalog.py",
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

interface ApiCatalog {
  keys: Set<string>;
  groupIds: string[];
  requires: Map<string, string[]>;
  /** key → built-in role slugs limited to holding it (`roles=`); absent = any role. */
  roles: Map<string, string[]>;
  /** How many `_p("…"` calls the source contains, parsed or not. */
  callCount: number;
  /** How many of those calls the def regex actually parsed. */
  parsedCount: number;
}

/**
 * Pull the permission defs out of catalog.py, on one line or spread over
 * several: `_p("key", "label"[, ("req", …)][, roles=("slug", …)][, store_wide=True])`.
 */
function parseApiCatalog(src: string): ApiCatalog {
  const keys = new Set<string>();
  const requires = new Map<string, string[]>();
  const roles = new Map<string, string[]>();
  const quoted = (s: string | undefined) => [...(s ?? "").matchAll(/"([^"]+)"/g)].map((r) => r[1]);
  const defRe = new RegExp(
    [
      /_p\(\s*"([^"]+)"\s*,\s*"[^"]*"/.source, // key, label
      /(?:\s*,\s*\(([^)]*)\))?/.source, // positional requires tuple
      /(?:\s*,\s*roles\s*=\s*\(([^)]*)\))?/.source, // roles=(…)
      /(?:\s*,\s*store_wide\s*=\s*(?:True|False))?/.source, // store_wide=…
      /\s*,?\s*\)/.source, // optional trailing comma, close
    ].join(""),
    "g"
  );
  let parsedCount = 0;
  for (let m = defRe.exec(src); m !== null; m = defRe.exec(src)) {
    parsedCount++;
    const key = m[1];
    keys.add(key);
    requires.set(key, quoted(m[2]));
    if (m[3] !== undefined) roles.set(key, quoted(m[3]));
  }
  const callCount = src.match(/_p\(\s*"/g)?.length ?? 0;

  const groupsBlock = /GROUPS:\s*dict\[str,\s*str\]\s*=\s*\{([\s\S]*?)\n\}/.exec(src);
  const groupIds = groupsBlock
    ? [...groupsBlock[1].matchAll(/"([^"]+)"\s*:\s*"[^"]*"/g)].map((m) => m[1])
    : [];

  return { keys, groupIds, requires, roles, callCount, parsedCount };
}

const apiSource = readApiCatalog();
const api = apiSource ? parseApiCatalog(apiSource) : null;

// Skips (rather than fails) when this repo is checked out on its own, but runs
// whenever the monorepo sibling is present.
describe.skipIf(api === null || api.keys.size === 0)(
  "cross-repo drift against engine/apps/rbac/catalog.py",
  () => {
    test("the parse actually found the API catalog (guards a silent regex break)", () => {
      // Without this, a regex that stops matching would turn every drift check
      // below into a vacuous pass.
      expect(api!.keys.size).toBeGreaterThan(40);
      expect(api!.keys.has("orders.refund")).toBe(true);
      expect(api!.groupIds).toContain("orders");
    });

    test("every _p(...) entry in catalog.py is parsed, however it is formatted", () => {
      // A key the regex skips (a new keyword argument, a multi-line call)
      // would drop out of every check below without failing any of them.
      expect(api!.callCount).toBeGreaterThan(40);
      expect(api!.parsedCount).toBe(api!.callCount);
      expect(api!.keys.size).toBe(api!.callCount);
    });

    test("role-limited keys match the role editor's note and never gate a group", () => {
      // RoleEditorDialog labels every key a role can't hold with its
      // `unavailableNote` message, which says "only Admin and Manager" in both
      // languages. A key limited to other roles needs that note changed. A
      // limited .view gate would take its whole group away, which the editor
      // does not explain.
      expect(api!.roles.size).toBeGreaterThan(0);
      for (const [key, slugs] of api!.roles) {
        expect([...slugs].sort(), `roles= on ${key}`).toEqual(["admin", "manager"]);
        expect(key.endsWith(".view"), `${key} is a view gate`).toBe(false);
      }
    });

    test("every permission key offered in the UI exists in the API catalog", () => {
      const missing = ALL_PERMISSION_KEYS.filter((k) => !api!.keys.has(k));
      expect(missing).toEqual([]);
    });

    test("every UI group id is a group the API declares", () => {
      const apiGroups = new Set(api!.groupIds);
      const unknown = PERMISSION_GROUPS.map((g) => g.id).filter((id) => !apiGroups.has(id));
      expect(unknown).toEqual([]);
    });

    test("the only API keys the UI withholds are the retired api_keys.*", () => {
      // Reverse direction: an API permission with no checkbox is a capability
      // merchants can never grant. api_keys.* is the one deliberate omission
      // (the Networking section is gone); anything else appearing here means
      // the API grew a permission and this mirror was never updated.
      const withheld = [...api!.keys]
        .filter((k) => !ALL_PERMISSION_KEYS.includes(k))
        .sort();
      expect(withheld).toEqual(["api_keys.manage", "api_keys.view"]);
    });

    test("UI expansion matches the API's declared requires-closure for every key", () => {
      // The UI approximates the server closure with "prefix + .view". Prove
      // that shortcut still equals what catalog.py actually declares, so a new
      // cross-group `requires` on the server can't slip past the editor.
      const closeWithApi = (key: string): Set<string> => {
        const out = new Set<string>();
        const stack = [key];
        while (stack.length) {
          const k = stack.pop()!;
          if (out.has(k)) continue;
          out.add(k);
          stack.push(...(api!.requires.get(k) ?? []));
        }
        return out;
      };
      for (const key of ALL_PERMISSION_KEYS) {
        expect([...expandPermissionKeys([key])].sort(), `expanding ${key}`).toEqual(
          [...closeWithApi(key)].sort()
        );
      }
    });

    test("UI group order follows the API's documented render order", () => {
      // catalog.py: "Ordered: the role editor renders groups in this order."
      // The UI list must be a subsequence of it (api_keys is skipped).
      const apiOrder = api!.groupIds;
      const uiOrder = PERMISSION_GROUPS.map((g) => g.id);
      let cursor = 0;
      const outOfOrder: string[] = [];
      for (const id of uiOrder) {
        const at = apiOrder.indexOf(id, cursor);
        if (at === -1) outOfOrder.push(id);
        else cursor = at + 1;
      }
      expect(outOfOrder).toEqual([]);
    });
  }
);
