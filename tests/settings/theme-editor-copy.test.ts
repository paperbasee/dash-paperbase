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

const enNs = (en as Record<string, any>).themeEditor as Record<string, string>;
const bnNs = (bn as Record<string, any>).themeEditor as Record<string, string>;

const SOURCES = [
  "src/app/[locale]/(dashboard)/settings/customize/page.tsx",
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
];

/**
 * Keys the panel looks up through a value rather than a literal: the message key a theme
 * file's page, content place or refused value carries. They are written in the pure files,
 * so they are read from there.
 */
const KEY_SOURCES = [
  "src/lib/theme-editor/link-targets.ts",
  "src/lib/theme-editor/content-links.ts",
  "src/lib/theme-editor/validate.ts",
];

describe("theme editor copy", () => {
  it("has the same keys in English and Bangla, all translated", () => {
    expect(Object.keys(bnNs).sort()).toEqual(Object.keys(enNs).sort());
    expect(Object.keys(enNs).filter((k) => enNs[k] === bnNs[k])).toEqual([]);
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
    }
    expect(used.size).toBeGreaterThan(70);
    expect([...used].filter((k) => !(k in enNs))).toEqual([]);
    expect([...used].filter((k) => !(k in bnNs))).toEqual([]);
  });

  it("names the browser tab in both languages", () => {
    const title = (messages: Record<string, any>) => messages.documentTitle.themeEditor;
    expect(title(en)).toBeTruthy();
    expect(title(bn)).toMatch(/[ঀ-৿]/);
  });
});
