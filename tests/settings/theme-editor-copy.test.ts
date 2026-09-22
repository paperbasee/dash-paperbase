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
import { PAGE_NOTES, SLOT_PAGES } from "@/lib/theme-editor/slot-catalogue";

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

/**
 * A key carried as a VALUE -- a slot's label, a field's error -- found under
 * either namespace, because nothing in the source says which reads it.
 */
const known = (ns: Record<string, string>, key: string) => key in ns || `slots.${key}` in ns;

/**
 * A key read through a translator, checked against THAT translator's namespace.
 *
 * `known` is not enough for these and being loose here cost a merchant a broken
 * screen: `partsChosen` was written into `themeEditor` and read through the
 * translator bound to `themeEditor.slots`, which this file called fine and
 * next-intl called MISSING_MESSAGE in the browser. A namespace is part of the
 * key, so the check has to be.
 */
const exact = (ns: Record<string, string>, namespace: string, key: string) =>
  (namespace ? `${namespace}.${key}` : key) in ns;

const SOURCES = [
  "src/app/[locale]/(dashboard)/settings/customize/page.tsx",
  "src/components/theme-editor/PreviewPane.tsx",
  "src/components/theme-editor/SaveStatus.tsx",
  "src/components/theme-editor/SettingsPanel.tsx",
  "src/components/theme-editor/SettingField.tsx",
  "src/components/theme-editor/BlockList.tsx",
  "src/components/theme-editor/LinkPicker.tsx",
  "src/components/theme-editor/EditorSheet.tsx",
  "src/components/theme-editor/CloseSheet.tsx",
  "src/components/theme-editor/ConflictDialog.tsx",
  "src/components/theme-editor/slots/SlotEditor.tsx",
  "src/components/theme-editor/slots/SlotCanvas.tsx",
  "src/components/theme-editor/slots/SlotDialog.tsx",
  "src/components/theme-editor/ProductPicker.tsx",
  "src/components/theme-editor/ChoicePicker.tsx",
  "src/components/theme-editor/slots/ShopChrome.tsx",
  "src/components/theme-editor/slots/StylePanel.tsx",
];

/**
 * Keys the panel looks up through a value rather than a literal: the message key a theme
 * file's page, content place or refused value carries. They are written in the pure files,
 * so they are read from there.
 */
const KEY_SOURCES = [
  // The slot catalogue is all keys: every slot, option and reason a merchant reads.
  "src/lib/theme-editor/slot-catalogue.ts",
  // Palettes and faces name their keys the same way.
  "src/components/theme-editor/slots/style-catalogue.ts",
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
    /** Keys read through a translator, by the namespace that translator reads. */
    const read = new Map<string, Set<string>>();
    for (const rel of SOURCES) {
      const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
      // Every translator bound to THIS namespace, whatever it is called. A
      // component may hold two -- `t` for `themeEditor.slots` and `tEditor` for
      // `themeEditor` -- and a key read through the second one slipped past a
      // check that only knew about `t`, which is how `themeEditor.save` reached
      // the browser. Translators for other namespaces (`tc`, `tCommon`) are
      // deliberately not collected: their keys do not live here.
      const ours = [
        ...text.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*"themeEditor(\.\w+)?"/g),
      ].map((m) => ({ name: m[1], namespace: (m[2] ?? "").replace(/^\./, "") }));
      for (const { name, namespace } of ours) {
        for (const m of text.matchAll(new RegExp(`\\b${name}\\(\\s*"(\\w+)"`, "g"))) {
          used.add(m[1]);
          const seen = read.get(namespace) ?? new Set<string>();
          seen.add(m[1]);
          read.set(namespace, seen);
        }
      }
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
      // Every slot, option, hint and locked reason names its key as a value.
      for (const m of text.matchAll(/\b(?:label|note|hint|lockedBecause|emptyLabel):\s*"(\w+)"/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(70);
    expect([...used].filter((k) => !known(enNs, k))).toEqual([]);
    expect([...used].filter((k) => !known(bnNs, k))).toEqual([]);

    // And in the namespace it is actually read through -- see `exact`.
    const misplaced: string[] = [];
    for (const [namespace, keys] of read) {
      for (const key of keys) {
        const where = namespace ? `themeEditor.${namespace}.${key}` : `themeEditor.${key}`;
        if (!exact(enNs, namespace, key)) misplaced.push(`en ${where}`);
        if (!exact(bnNs, namespace, key)) misplaced.push(`bn ${where}`);
      }
    }
    expect(misplaced).toEqual([]);
  });

  /**
   * next-intl parses every message as ICU, and ICU reads `<name>` as the start
   * of a rich-text tag. An unmatched one does not fall back to the raw text --
   * it throws INVALID_MESSAGE: UNCLOSED_TAG at render, and the screen that asked
   * for it dies. A hint that quoted a query string as `?tag=<name>` took the
   * whole editor down that way.
   *
   * This namespace uses no rich text at all, so ANY angle-bracket pair is the
   * bug rather than a use, and the fix is always to say it in words.
   */
  /**
   * The page-level warnings, which the regex sweep above cannot see: the editor
   * reads them as `t(PAGE_NOTES[page])`, so neither the key nor the call is a
   * literal anywhere. Reading the real object is both shorter and surer.
   *
   * A page named here must also be a page: the note is drawn from the picker's
   * current value, so one keyed to a page nobody can select says nothing.
   */
  it("says which pages are not built yet, in both languages", () => {
    const notes = Object.entries(PAGE_NOTES);
    expect(notes.length).toBeGreaterThan(0);
    for (const [page, key] of notes) {
      expect(SLOT_PAGES, `${page} is not in the page picker`).toContain(page);
      expect(known(enNs, key), `en is missing ${key}`).toBe(true);
      expect(known(bnNs, key), `bn is missing ${key}`).toBe(true);
    }
  });

  it("quotes nothing in angle brackets, which ICU reads as a tag", () => {
    const tagged = (ns: Record<string, string>, lang: string) =>
      Object.entries(ns)
        .filter(([, value]) => /<[^>]*>/.test(value))
        .map(([key]) => `${lang}.${key}`);
    expect([...tagged(enNs, "en"), ...tagged(bnNs, "bn")]).toEqual([]);
  });

  it("names the browser tab in both languages", () => {
    const title = (messages: Record<string, any>) => messages.documentTitle.themeEditor;
    expect(title(en)).toBeTruthy();
    expect(title(bn)).toMatch(/[ঀ-৿]/);
  });
});
