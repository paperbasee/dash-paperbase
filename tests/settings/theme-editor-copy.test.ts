/**
 * Copy integrity for the theme editor: a key a component reads that is missing in either
 * language renders the raw key, and most merchants read the Bangla one.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * The namespace, flattened.
 *
 * `themeEditor` holds one nested namespace, `slots` -- the slot editor reads it as
 * `useTranslations("themeEditor.slots")` -- so the strings live one level down.
 * Flattening keeps every check below working on strings rather than teaching each
 * one to walk, and a key is then checked by either spelling: `done` for the flat
 * namespace, `slots.done` for the nested one.
 */
const flatten = (source: Record<string, any>, prefix = ""): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object") Object.assign(out, flatten(value, `${prefix}${key}.`));
    else out[`${prefix}${key}`] = String(value);
  }
  return out;
};

const enNs = flatten((en as Record<string, any>).themeEditor);
const bnNs = flatten((bn as Record<string, any>).themeEditor);

/** A key a component asked for, found under the namespace it reads or under `slots`. */
const known = (ns: Record<string, string>, key: string) => key in ns || `slots.${key}` in ns;

const SOURCES = [
  "src/app/[locale]/(dashboard)/settings/customize/page.tsx",
  "src/app/[locale]/(dashboard)/settings/customize/sections/page.tsx",
  "src/components/theme-editor/ThemeEditor.tsx",
  "src/components/theme-editor/EditorTopBar.tsx",
  "src/components/theme-editor/SectionList.tsx",
  "src/components/theme-editor/PreviewPane.tsx",
  "src/components/theme-editor/SaveStatus.tsx",
  "src/components/theme-editor/SettingsPanel.tsx",
  "src/components/theme-editor/SettingField.tsx",
  "src/components/theme-editor/BlockList.tsx",
  "src/components/theme-editor/LinkPicker.tsx",
  "src/components/theme-editor/EditorSheet.tsx",
  "src/components/theme-editor/EditorMenu.tsx",
  "src/components/theme-editor/VersionHistorySheet.tsx",
  "src/components/theme-editor/CloseSheet.tsx",
  "src/components/theme-editor/ConflictDialog.tsx",
  "src/components/theme-editor/slots/SlotEditor.tsx",
  "src/components/theme-editor/slots/SlotCanvas.tsx",
  "src/components/theme-editor/slots/ShopChrome.tsx",
];

/**
 * Keys the panel looks up through a value rather than a literal: the message key a theme
 * file's page, content place or refused value carries. They are written in the pure files,
 * so they are read from there.
 */
const KEY_SOURCES = [
  // The slot catalogue is all keys: every slot, option and reason a merchant reads.
  "src/lib/theme-editor/slot-catalogue.ts",
  "src/lib/theme-editor/link-targets.ts",
  "src/lib/theme-editor/content-links.ts",
  "src/lib/theme-editor/validate.ts",
];

describe("theme editor copy", () => {
  it("has the same keys in English and Bangla, all translated", () => {
    expect(Object.keys(bnNs).sort()).toEqual(Object.keys(enNs).sort());
    // A string made only of placeholders and punctuation — the field counter's "20 / 200" —
    // has nothing to translate, and a Bangla reader gets Bangla digits from the formatter.
    const hasWords = (value: string) => /\p{L}/u.test(value.replace(/\{[^}]*\}/g, ""));
    expect(Object.keys(enNs).filter((k) => enNs[k] === bnNs[k] && hasWords(enNs[k]))).toEqual([]);
  });

  it("types every counted placeholder, so Bangla gets Bangla digits", () => {
    // A bare {max} renders "40" even at locale bn; only "{max, number}" gives "৪০".
    const COUNTED = ["max", "used", "position", "total", "count", "seconds"];
    const bare = (ns: Record<string, string>, lang: string) =>
      Object.entries(ns)
        .filter(([, v]) => COUNTED.some((n) => new RegExp(`\\{\\s*${n}\\s*\\}`).test(v)))
        .map(([k]) => `${lang}.${k}`);
    expect([...bare(enNs, "en"), ...bare(bnNs, "bn")]).toEqual([]);
  });

  it("keeps every placeholder in Bangla", () => {
    // Both shapes: a plain {name} and a formatted one ("{max, number}"), which is every
    // counter and limit the settings panel writes.
    const placeholders = (value: string) =>
      [...value.matchAll(/\{(\w+)(?:\s*,[^}]*)?\}/g)].map((m) => m[1]).sort();
    expect(Object.keys(enNs).filter((k) => placeholders(enNs[k]).join() !== placeholders(bnNs[k]).join())).toEqual([]);
  });

  it("every key the editor asks for exists in both languages", () => {
    const used = new Set<string>();
    for (const rel of SOURCES) {
      const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
      for (const m of text.matchAll(/\bt\(\s*"(\w+)"/g)) used.add(m[1]);
      for (const m of text.matchAll(/labelKey: "(\w+)"/g)) used.add(m[1]);
      // The notes for a page the shop has nothing to show on.
      for (const m of text.matchAll(/(?:category|product|post): "(preview\w+)"/g)) used.add(m[1]);
      // A page of the link picker, and the place a section's content is managed.
      for (const m of text.matchAll(/\bkey: "((?:link|content|field)\w+)"/g)) used.add(m[1]);
    }
    for (const rel of KEY_SOURCES) {
      const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
      for (const m of text.matchAll(/\bkey: "((?:link|content|field)\w+)"/g)) used.add(m[1]);
      // The message keys a refused value carries (validate.ts FieldProblem).
      for (const m of text.matchAll(/^ {2}\| "(field\w+)"$/gm)) used.add(m[1]);
      // Every slot, option and locked reason names its key as a value.
      for (const m of text.matchAll(/\b(?:label|note|lockedBecause|emptyLabel):\s*"(\w+)"/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(70);
    expect([...used].filter((k) => !known(enNs, k))).toEqual([]);
    expect([...used].filter((k) => !known(bnNs, k))).toEqual([]);
  });

  it("names the browser tab in both languages", () => {
    const title = (messages: Record<string, any>) => messages.documentTitle.themeEditor;
    expect(title(en)).toBeTruthy();
    expect(title(bn)).toMatch(/[ঀ-৿]/);
  });
});
