/**
 * The home page's order is written twice, and the two must agree (2026-09-26).
 *
 * The editor lists the home page's places top to bottom (`slot-catalogue.ts`), and
 * a new section lands under the places above it (`placeFor`). The API seeds new
 * shops, and re-sorts stored pages, by its own list (`HOME_ORDER`, and the
 * migration that last moved it). When the two disagree, a merchant edits one
 * order and their shop draws another -- which is how the featured band once
 * ended up at the bottom of a page. Best sellers moving up is the first change
 * made to both at once; this keeps them together from here on.
 *
 * Skipped where the API is not checked out beside this repository.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { sectionTypesOf, wiringFor } from "@/lib/theme-editor/slot-sections";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SEED = path.resolve(ROOT, "../api-paperbase/engine/apps/theming/management/commands/seed_theme_baseline.py");

describe.skipIf(!fs.existsSync(SEED))("the editor's home order and the API's", () => {
  const text = fs.readFileSync(SEED, "utf8");
  // The tuple runs to the bracket on a line of its own; its comments can hold
  // brackets and quotes of their own, so they go first.
  const tuple = (text.match(/^HOME_ORDER = \(([\s\S]*?)^\)/m)?.[1] ?? "").replace(/#.*$/gm, "");
  const api = [...tuple.matchAll(/"(\w+)"/g)].map((m) => m[1]);

  const editor = SLOTS.home
    .filter((slot) => !slot.inheritedFrom)
    .flatMap((slot) => {
      const wiring = wiringFor("home", slot.key);
      return wiring ? sectionTypesOf(wiring) : [];
    });

  test("every section the editor places is in the API's list, in the same order", () => {
    expect(editor.filter((type) => !api.includes(type))).toEqual([]);
    const inApiOrder = [...editor].sort((a, b) => api.indexOf(a) - api.indexOf(b));
    expect(editor).toEqual(inApiOrder);
  });

  test("best sellers sit straight under the featured band", () => {
    expect(editor.indexOf("best_sellers")).toBe(editor.indexOf("featured_products") + 1);
    expect(api.indexOf("best_sellers")).toBe(api.indexOf("featured_products") + 1);
  });
});
