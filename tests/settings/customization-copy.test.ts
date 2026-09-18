/**
 * Copy integrity for Settings > Customization: the theme page and the card style
 * picker. A key a component reads that is missing in either language renders the
 * raw key, and most merchants read the Bangla one.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SETTINGS = "src/app/[locale]/(dashboard)/settings";

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, SETTINGS, rel), "utf8");
}

const enNs = (en as Record<string, any>).settings.customization as Record<string, string>;
const bnNs = (bn as Record<string, any>).settings.customization as Record<string, string>;

describe("customization copy", () => {
  it("has the same keys in English and Bangla, all translated", () => {
    expect(Object.keys(bnNs).sort()).toEqual(Object.keys(enNs).sort());
    expect(Object.keys(enNs).filter((k) => enNs[k] === bnNs[k])).toEqual([]);
  });

  it("keeps every placeholder in Bangla", () => {
    const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    expect(Object.keys(enNs).filter((k) => placeholders(enNs[k]).join() !== placeholders(bnNs[k]).join())).toEqual([]);
  });

  it("every customization key the components ask for exists in both languages", () => {
    const used = new Set<string>();
    for (const m of read("sections/CustomizationSection.tsx").matchAll(/\btc\(\s*"(\w+)"/g)) used.add(m[1]);
    for (const file of [
      "_components/CardVariantPicker.tsx",
      "_components/CurrentThemeCard.tsx",
      "_components/ThemeLibrary.tsx",
      "_components/ThemeLockNotice.tsx",
    ]) {
      const text = read(file);
      for (const m of text.matchAll(/\bt\(\s*"(\w+)"/g)) used.add(m[1]);
      // A key chosen by a condition: t(started ? "continueTheme" : "tryTheme").
      for (const m of text.matchAll(/\bt\([^)]*\?\s*"(\w+)"\s*:\s*"(\w+)"/g)) {
        used.add(m[1]);
        used.add(m[2]);
      }
    }
    expect(used.size).toBeGreaterThan(30);
    expect([...used].filter((k) => !(k in enNs))).toEqual([]);
    expect([...used].filter((k) => !(k in bnNs))).toEqual([]);
  });
});
