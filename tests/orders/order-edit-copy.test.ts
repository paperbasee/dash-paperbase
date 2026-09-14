/**
 * Copy for the order editor's Save path. A key missing in one language renders the raw
 * key to the merchant, which is exactly the kind of unreadable feedback this editor had.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PAGE = fs.readFileSync(
  path.join(ROOT, "src/app/[locale]/(dashboard)/orders/[public_id]/page.tsx"),
  "utf8",
);

const enPages = (en as Record<string, any>).pages as Record<string, string>;
const bnPages = (bn as Record<string, any>).pages as Record<string, string>;

const SAVE_KEYS = [
  "toastTitleOrderUpdated",
  "toastDescOrderUpdated",
  "orderValidationZoneRequired",
  "orderValidationThanaRequired",
  "orderValidationDistrictRequired",
  "toastTitleChangesNotSavedOrder",
  "toastDescChangesNotSavedOrder",
];

describe("order editor copy", () => {
  it("has every Save key in English and Bengali, translated and non-empty", () => {
    for (const key of SAVE_KEYS) {
      expect(enPages[key]?.trim(), `en ${key}`).toBeTruthy();
      expect(bnPages[key]?.trim(), `bn ${key}`).toBeTruthy();
      expect(bnPages[key], `bn ${key} is untranslated`).not.toBe(enPages[key]);
    }
  });

  it("uses the Save keys on the order page", () => {
    for (const key of SAVE_KEYS) {
      expect(PAGE, key).toContain(`"${key}"`);
    }
  });

  it("every pages key the order page asks for exists in both languages", () => {
    const used = [...new Set([...PAGE.matchAll(/\btPages\(\s*"(\w+)"/g)].map((m) => m[1]))];
    expect(used.length).toBeGreaterThan(20);
    expect(used.filter((k) => !(k in enPages))).toEqual([]);
    expect(used.filter((k) => !(k in bnPages))).toEqual([]);
  });
});
