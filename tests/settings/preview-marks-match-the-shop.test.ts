/**
 * The shop marks its places, and the editor reads the marks (2026-09-26).
 *
 * The page in the middle of the editor is the storefront drawing the merchant's draft. It says,
 * in the preview only, which of the editor's places each part is -- `{{ 'header:logo' | place }}`
 * in the theme's Liquid, or `mark: 'category:more'` handed to a shared piece. The names are this
 * editor's, written in another repository, so this reads them from there and checks both ways:
 *
 *   every mark names a place the editor has    a typo would be a click that opens nothing
 *   every place a click must reach is marked   where one section is several places, an unmarked
 *                                              one would open its section's first place instead
 *
 * Skipped where the storefront is not checked out beside this repository.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { namedPlace } from "@/lib/theme-editor/preview-picks";
import { SLOTS, type SlotPageKey } from "@/lib/theme-editor/slot-catalogue";
import { sectionTypesOf, wiringFor } from "@/lib/theme-editor/slot-sections";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const THEME = path.resolve(ROOT, "../shop-paperbase/themes/storefront");

function liquidFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return liquidFiles(full);
    return entry.name.endsWith(".liquid") ? [full] : [];
  });
}

/**
 * Places a click cannot land on, because the page draws nothing that is only them: a behaviour
 * (the header staying on screen) or a look that every icon carries (the words beside them). The
 * list beside the shop is how a merchant reaches these.
 */
const NOT_A_PART: Record<string, string> = {
  "header:sticky": "a behaviour: whether the header stays on screen",
  "header:words": "the words beside every icon, not a part of their own",
  "wishlist:action": "drawn on every saved card, inside the shop's shared product card",
};

describe.skipIf(!fs.existsSync(THEME))("the shop's marks and the editor's places", () => {
  const text = liquidFiles(THEME).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const marked = new Set([
    ...[...text.matchAll(/'([^']+)'\s*\|\s*place\b/g)].map((m) => m[1]),
    ...[...text.matchAll(/\bmark:\s*'([^']+)'/g)].map((m) => m[1]),
  ]);

  test("the shop marks its places", () => {
    expect(marked.size).toBeGreaterThan(50);
  });

  test("every mark names a place the editor has", () => {
    expect([...marked].filter((name) => namedPlace(name) === null)).toEqual([]);
  });

  test("every place that shares its section with others can be clicked", () => {
    // By section, in the editor's order: the first place of each is what a click on the section
    // itself opens, so it needs no mark of its own.
    const bySection = new Map<string, string[]>();
    for (const page of Object.keys(SLOTS) as SlotPageKey[]) {
      for (const slot of SLOTS[page]) {
        if (slot.inheritedFrom) continue;
        const wiring = wiringFor(page, slot.key);
        if (!wiring) continue;
        for (const type of sectionTypesOf(wiring)) {
          const key = `${wiring.page}/${type}`;
          bySection.set(key, [...(bySection.get(key) ?? []), `${page}:${slot.key}`]);
        }
      }
    }
    const unreachable: string[] = [];
    for (const places of bySection.values()) {
      for (const place of places.slice(1)) {
        if (!marked.has(place) && !(place in NOT_A_PART)) unreachable.push(place);
      }
    }
    expect(unreachable).toEqual([]);
  });

  test("a place said to be no part of the page really has no mark", () => {
    expect(Object.keys(NOT_A_PART).filter((place) => marked.has(place))).toEqual([]);
  });
});
