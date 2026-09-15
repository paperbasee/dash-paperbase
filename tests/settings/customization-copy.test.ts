/**
 * Copy integrity for Settings > Customization. The palette picker and its strings
 * were removed, so a key the card style picker still reads, or one missing in
 * Bangla, renders the raw key.
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

  it("every customization key the components ask for exists in both languages", () => {
    const used = new Set<string>();
    for (const m of read("sections/CustomizationSection.tsx").matchAll(/\btc\(\s*"(\w+)"/g)) used.add(m[1]);
    for (const m of read("_components/CardVariantPicker.tsx").matchAll(/\bt\(\s*"(\w+)"/g)) used.add(m[1]);
    expect(used.size).toBeGreaterThan(4);
    expect([...used].filter((k) => !(k in enNs))).toEqual([]);
    expect([...used].filter((k) => !(k in bnNs))).toEqual([]);
  });
});
