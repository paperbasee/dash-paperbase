import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ALL_SECTIONS,
  SECTIONS,
  SECTION_APPS,
  SECTION_OWNER_ONLY,
  SECTION_PERMISSION,
  isSectionVisible,
  resolveSettingsSection,
  sectionMatchesPermission,
  type SettingsSection,
  type SettingsSectionNavItem,
} from "@/app/[locale]/(dashboard)/settings/settingsSections";
import { APP_CONFIG } from "@/config/apps";
import { ALL_PERMISSION_KEYS, APP_VIEW_PERMISSION } from "@/config/permissions";

/**
 * settingsSections is the single source of truth for which settings tabs a
 * merchant sees. Its permission map is supposed to MIRROR what each section's
 * backend GET requires: drift means a role sees a nav row and then eats a 403.
 * These tests pin the parts that have already regressed.
 */

const MODULE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/app/[locale]/(dashboard)/settings/settingsSections.ts",
);
const MODULE_SOURCE = fs.readFileSync(MODULE_PATH, "utf8");

const MESSAGES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../messages",
);

function loadSettingsMessages(locale: "en" | "bn"): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8");
  const parsed = JSON.parse(raw) as { settings?: Record<string, unknown> };
  return parsed.settings ?? {};
}

const SECTION_IDS = SECTIONS.map((row) => row.id);
/** Flag-independent: orphan checks ask whether a key names a real section. */
const CATALOG_IDS = ALL_SECTIONS.map((row) => row.id);

/** A `has` that grants exactly the listed keys and records what was asked. */
function grants(...keys: string[]) {
  const asked: string[] = [];
  const set = new Set(keys);
  const has = (key: string) => {
    asked.push(key);
    return set.has(key);
  };
  return { has, asked };
}

/**
 * Runs the visibility check that page.tsx, SettingsNav.tsx and
 * SettingsSidebarNav.tsx share (useVisibleSettingsSections), so role-shaped
 * expectations below exercise the real maps rather than a hand-written allow
 * list. Unless a test says otherwise every optional app is enabled and app
 * access follows APP_VIEW_PERMISSION, as PermissionsContext.canViewApp does.
 */
function visibleIdsFor(
  has: (key: string) => boolean,
  opts: {
    isOwner?: boolean;
    isSuperuser?: boolean;
    sections?: SettingsSectionNavItem[];
    canShowApp?: (appId: string) => boolean;
  } = {},
): SettingsSection[] {
  const { isOwner = false, isSuperuser = false } = opts;
  const canShowApp =
    opts.canShowApp ?? ((appId: string) => isOwner || isSuperuser || has(APP_VIEW_PERMISSION[appId]));
  return (opts.sections ?? SECTIONS)
    .filter((row) => isSectionVisible(row.id, { has, isOwner, isSuperuser, canShowApp }))
    .map((row) => row.id);
}

describe("sectionMatchesPermission", () => {
  it("treats an absent requirement as open to every staff member", () => {
    const denyAll = grants();
    expect(sectionMatchesPermission(undefined, denyAll.has)).toBe(true);
    // A section with no requirement must not even consult the permission set.
    expect(denyAll.asked).toEqual([]);
  });

  it("requires exactly the named key when the requirement is a single string", () => {
    expect(sectionMatchesPermission("domains.view", grants("domains.view").has)).toBe(true);
    expect(sectionMatchesPermission("domains.view", grants("billing.view").has)).toBe(false);
    expect(sectionMatchesPermission("domains.view", grants().has)).toBe(false);
  });

  it("asks the permission oracle for the literal key, not a normalised variant", () => {
    const probe = grants("settings.view");
    sectionMatchesPermission("settings.view", probe.has);
    expect(probe.asked).toEqual(["settings.view"]);
  });

  it("does not imply a .view key from the matching .manage key", () => {
    // There is no hierarchy in this helper: holding settings.manage does NOT
    // satisfy a settings.view requirement. The server-side catalog is what
    // grants both to a role; this module must never guess.
    expect(sectionMatchesPermission("settings.view", grants("settings.manage").has)).toBe(false);
  });

  it("does not prefix-match or substring-match permission keys", () => {
    expect(sectionMatchesPermission("domains.view", grants("domains").has)).toBe(false);
    expect(sectionMatchesPermission("domains.view", grants("domains.view.all").has)).toBe(false);
    expect(sectionMatchesPermission("team.view", grants("team.view ").has)).toBe(false);
  });

  it("treats an array requirement as ANY-of, not all-of", () => {
    // Pinned explicitly: Integrations bundles marketing + couriers and relies on
    // any-of. If this ever flips to all-of, a courier-only role loses the tab.
    const required = ["integrations.view", "couriers.view"];
    expect(sectionMatchesPermission(required, grants("integrations.view").has)).toBe(true);
    expect(sectionMatchesPermission(required, grants("couriers.view").has)).toBe(true);
    expect(sectionMatchesPermission(required, grants("integrations.view", "couriers.view").has)).toBe(
      true,
    );
    expect(sectionMatchesPermission(required, grants("settings.view").has)).toBe(false);
  });

  it("satisfies an array requirement from a later key alone (proves any-of)", () => {
    // Holding only the LAST key must be enough — a `.every` implementation
    // would pass the first-key case above but fail here.
    expect(sectionMatchesPermission(["a.view", "b.view", "c.view"], grants("c.view").has)).toBe(true);
    expect(sectionMatchesPermission(["a.view", "b.view", "c.view"], grants("d.view").has)).toBe(false);
  });

  it("treats an empty array requirement as unsatisfiable, not as open", () => {
    // Edge case worth knowing: [] is truthy, so it falls through to .some()
    // which is false for every role — the section becomes invisible to all.
    expect(sectionMatchesPermission([], grants("settings.view", "billing.view").has)).toBe(false);
  });

  it("treats an empty-string requirement as open (falsy short-circuit)", () => {
    // CURRENT BEHAVIOUR, asserted deliberately: "" is falsy so the guard
    // `if (!required) return true` fires and the section is shown to everyone.
    // A typo'd empty key therefore fails open. See notes.
    const denyAll = grants();
    expect(sectionMatchesPermission("", denyAll.has)).toBe(true);
    expect(denyAll.asked).toEqual([]);
  });
});

describe("SECTIONS integrity", () => {
  it("has unique section ids", () => {
    expect(new Set(SECTION_IDS).size).toBe(SECTION_IDS.length);
  });

  it("gives every section a usable, non-empty label in both locales", () => {
    const en = loadSettingsMessages("en");
    const bn = loadSettingsMessages("bn");

    for (const row of SECTIONS) {
      if ("labelKey" in row) {
        for (const [locale, messages] of [
          ["en", en],
          ["bn", bn],
        ] as const) {
          const value = messages[row.labelKey];
          expect(
            typeof value === "string" && value.trim().length > 0,
            `settings.${row.labelKey} missing from messages/${locale}.json (section "${row.id}")`,
          ).toBe(true);
          // A key echoed back as its own value means next-intl fell through.
          expect(value).not.toBe(row.labelKey);
        }
      } else {
        expect(
          typeof row.displayLabel === "string" && row.displayLabel.trim().length > 0,
          `section "${row.id}" has an empty displayLabel`,
        ).toBe(true);
        // A literal label must not be a translation key smuggled into the
        // wrong field — that would render "sectionFoo" in the nav.
        expect(row.displayLabel.startsWith("section")).toBe(false);
      }
    }
  });

  it("gives exactly one label channel per section (never both, never neither)", () => {
    for (const row of SECTIONS as SettingsSectionNavItem[]) {
      const hasKey = "labelKey" in row;
      const hasLiteral = "displayLabel" in row;
      expect(hasKey !== hasLiteral, `section "${row.id}" label channels: ${hasKey}/${hasLiteral}`).toBe(
        true,
      );
    }
  });

  it("gives every section a renderable icon component", () => {
    for (const row of SECTIONS) {
      // Lucide and Phosphor icons are forwardRef exotic components (objects);
      // plain function components are also acceptable.
      expect(row.icon, `section "${row.id}" has no icon`).toBeTruthy();
      expect(["function", "object"]).toContain(typeof row.icon);
    }
  });
});

describe("permission map ↔ SECTIONS consistency", () => {
  it("has no orphaned SECTION_PERMISSION keys", () => {
    const orphans = Object.keys(SECTION_PERMISSION).filter(
      (id) => !CATALOG_IDS.includes(id as SettingsSection),
    );
    expect(orphans).toEqual([]);
  });

  it("has no orphaned SECTION_OWNER_ONLY keys", () => {
    const orphans = Object.keys(SECTION_OWNER_ONLY).filter(
      (id) => !CATALOG_IDS.includes(id as SettingsSection),
    );
    expect(orphans).toEqual([]);
  });

  it("declares only permission keys that exist in the RBAC catalog mirror", () => {
    // Drift guard: a key that is not in config/permissions.ts can never be held
    // by any role, so the section would silently vanish for everyone but owners.
    const catalog = new Set(ALL_PERMISSION_KEYS);
    const unknown: string[] = [];
    for (const [id, required] of Object.entries(SECTION_PERMISSION)) {
      for (const key of Array.isArray(required) ? required : [required!]) {
        if (!catalog.has(key)) unknown.push(`${id} -> ${key}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("never declares an empty or blank requirement (which would fail open)", () => {
    for (const [id, required] of Object.entries(SECTION_PERMISSION)) {
      const keys = Array.isArray(required) ? required : [required!];
      expect(keys.length, `section "${id}" has an empty requirement array`).toBeGreaterThan(0);
      for (const key of keys) {
        expect(typeof key).toBe("string");
        expect(key.trim(), `section "${id}" has a blank permission key`).toBe(key);
        expect(key.length).toBeGreaterThan(0);
      }
    }
  });

  it("has no orphaned SECTION_APPS keys and names only real, permission-gated apps", () => {
    const orphans = Object.keys(SECTION_APPS).filter(
      (id) => !CATALOG_IDS.includes(id as SettingsSection),
    );
    expect(orphans).toEqual([]);
    for (const [id, apps] of Object.entries(SECTION_APPS)) {
      expect(apps!.length, `section "${id}" lists no apps`).toBeGreaterThan(0);
      for (const appId of apps!) {
        expect(APP_CONFIG[appId], `section "${id}" -> unknown app "${appId}"`).toBeDefined();
        expect(APP_VIEW_PERMISSION[appId], `section "${id}" -> app "${appId}" has no view key`).toBeDefined();
      }
    }
  });

  it("marks owner-only sections with a literal true (a false value is a silent no-op)", () => {
    for (const [id, value] of Object.entries(SECTION_OWNER_ONLY)) {
      // The consumers guard with `if (SECTION_OWNER_ONLY[row.id] && ...)`, so a
      // `false` entry reads as "owner only" but behaves as "open".
      expect(value, `SECTION_OWNER_ONLY["${id}"] must be true or absent`).toBe(true);
    }
  });
});

describe("role-shaped visibility (the maps as consumers apply them)", () => {
  it("shows a permissionless staff member only the ungated sections", () => {
    // account has no requirement; security is ungated but owner-only.
    expect(visibleIdsFor(grants().has).sort()).toEqual(["account"]);
  });

  it("keeps owner-only sections away from a non-owner who somehow holds every key", () => {
    const superRole = { has: () => true };
    expect(visibleIdsFor(superRole.has)).not.toContain("security");
    expect(visibleIdsFor(superRole.has, { isOwner: true })).toContain("security");
    expect(visibleIdsFor(superRole.has, { isSuperuser: true })).toContain("security");
  });

  it("shows Integrations to a courier-only role and nothing else it cannot load", () => {
    // The concrete any-of case that motivated the array form.
    expect(visibleIdsFor(grants("couriers.view").has).sort()).toEqual(["account", "integrations"]);
  });

  it("does not leak Team or Billing to a role holding only settings.view", () => {
    const visible = visibleIdsFor(grants("settings.view").has);
    expect(visible).toContain("store");
    expect(visible).toContain("checkout");
    expect(visible).toContain("apps");
    expect(visible).not.toContain("team");
    expect(visible).not.toContain("billing");
    expect(visible).not.toContain("domains");
    // notifications is gated on settings.manage, not settings.view — the panel
    // itself re-checks settings.manage, so the nav row must agree.
    expect(visible).not.toContain("notifications");
  });

  it("shows every section to the owner", () => {
    expect(visibleIdsFor(() => true, { isOwner: true }).sort()).toEqual([...SECTION_IDS].sort());
  });
});

describe("active section (what the page shows and the sidebar highlights)", () => {
  const rows = (...ids: SettingsSection[]) => SECTIONS.filter((row) => ids.includes(row.id));

  it("uses the URL's tab when the user can see it", () => {
    expect(resolveSettingsSection("team", SECTIONS)).toBe("team");
    expect(resolveSettingsSection(" billing ", SECTIONS)).toBe("billing");
  });

  it("opens the first visible section when the tab is missing, unknown or hidden", () => {
    expect(resolveSettingsSection(null, SECTIONS)).toBe("store");
    expect(resolveSettingsSection("networking", SECTIONS)).toBe("store");
    expect(resolveSettingsSection("store", rows("integrations", "account"))).toBe("integrations");
  });

  it("follows the URL's tab again once that section becomes visible", () => {
    // Enabled apps can arrive after the page mounts; no earlier fallback may stick.
    expect(resolveSettingsSection("promotions", rows("store", "account"))).toBe("store");
    expect(resolveSettingsSection("promotions", rows("store", "promotions", "account"))).toBe(
      "promotions",
    );
  });
});

describe("REGRESSION: the Networking / API keys section stays removed", () => {
  /**
   * WHY THIS EXISTS — do not delete casually.
   *
   * Settings once had a "networking" section exposing storefront API keys.
   * A merchant regenerated their own key in production and took their live
   * storefront offline, because the deployed storefront had that key baked in.
   * The section was removed deliberately; keys are platform-managed now, and
   * host routing (see the "domains" section) is the supported replacement.
   *
   * If you are re-adding it, that must be a conscious product decision — update
   * this test with the reasoning, don't just delete it.
   */

  it("exposes no 'networking' section id", () => {
    expect(SECTION_IDS).not.toContain("networking" as SettingsSection);
  });

  it("has no 'networking' key in SECTION_PERMISSION or SECTION_OWNER_ONLY", () => {
    expect(Object.keys(SECTION_PERMISSION)).not.toContain("networking");
    expect(Object.keys(SECTION_OWNER_ONLY)).not.toContain("networking");
  });

  it("references no api_keys.* permission anywhere in the maps", () => {
    const declared = Object.values(SECTION_PERMISSION).flatMap((required) =>
      Array.isArray(required) ? required : [required!],
    );
    expect(declared.filter((key) => /api[_-]?key/i.test(key))).toEqual([]);
  });

  it("carries no networking/api-key wording in the module source at all", () => {
    // Belt-and-braces: catches a re-added entry in the SettingsSection type
    // union or the label-key union, which are erased at runtime and so are
    // invisible to the assertions above.
    expect(/networking/i.test(MODULE_SOURCE)).toBe(false);
    expect(/api[_-]?keys?/i.test(MODULE_SOURCE)).toBe(false);
  });
});

describe("REGRESSION: 'domains' survives as host routing's settings surface", () => {
  it("keeps the domains section in the catalog", () => {
    const domains = ALL_SECTIONS.find((row) => row.id === "domains");
    expect(domains, "the domains section must not be collateral damage of the networking removal").toBeDefined();
    expect(domains && "labelKey" in domains && domains.labelKey).toBe("sectionDomains");
  });

  it("gates domains on domains.view and not on owner-only", () => {
    expect(SECTION_PERMISSION.domains).toBe("domains.view");
    expect(SECTION_OWNER_ONLY.domains).toBeUndefined();
  });

  it("shows domains to a staff role holding only domains.view", () => {
    expect(sectionMatchesPermission(SECTION_PERMISSION.domains, grants("domains.view").has)).toBe(true);
    expect(
      visibleIdsFor(grants("domains.view").has, { sections: ALL_SECTIONS }),
    ).toContain("domains");
    // ...and hides it from a role without that key.
    expect(
      visibleIdsFor(grants("settings.manage").has, { sections: ALL_SECTIONS }),
    ).not.toContain("domains");
  });
});

/**
 * The Domains UI walks a merchant through repointing a real domain. The platform
 * can only honour that once host routing and certificate provisioning are on, so
 * the section ships dark and is opened deliberately, per environment.
 */
describe("domains section is gated until the platform can serve custom domains", () => {
  it("is absent from the nav unless NEXT_PUBLIC_DOMAINS_ENABLED is set", () => {
    // The suite runs without the flag, which is also the production default.
    expect(process.env.NEXT_PUBLIC_DOMAINS_ENABLED).not.toBe("1");
    expect(SECTIONS.map((row) => row.id)).not.toContain("domains");
  });

  it("still exists in the catalog, so the flag flips it on rather than re-adding it", () => {
    expect(ALL_SECTIONS.map((row) => row.id)).toContain("domains");
  });

  it("gates on an explicit opt-in value, not mere presence of the variable", () => {
    // `=== "1"` and not a truthiness check: an empty or "0" value must stay off.
    expect(MODULE_SOURCE).toMatch(
      /process\.env\.NEXT_PUBLIC_DOMAINS_ENABLED === "1"/,
    );
  });

  it("filters the nav from the catalog, so no other section is affected", () => {
    const hidden = ALL_SECTIONS.map((r) => r.id).filter(
      (id) => !SECTIONS.map((r) => r.id).includes(id),
    );
    expect(hidden).toEqual(["domains"]);
  });
});
