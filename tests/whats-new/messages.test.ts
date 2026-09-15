/**
 * Chrome strings for the What's new menu item and panel. A key missing in one language
 * renders the raw key to the merchant.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const enNs = (en as Record<string, any>).whatsNew as Record<string, string> | undefined;
const bnNs = (bn as Record<string, any>).whatsNew as Record<string, string> | undefined;

const KEYS = [
  "menuLabel",
  "menuUnreadAria",
  "userMenuUnreadAria",
  "panelTitle",
  "panelDescription",
  "tagNew",
  "tagImproved",
  "tagFixed",
  "unreadMarker",
  "openLink",
  "empty",
  "versionLabel",
  "close",
];

const SOURCES = [
  "src/components/Sidebar.tsx",
  "src/components/whats-new/WhatsNewPanel.tsx",
].map((rel) => ({ rel, text: fs.readFileSync(path.join(ROOT, rel), "utf8") }));

describe("what's new messages", () => {
  it("has every key in English and Bangla, non-empty and translated", () => {
    expect(enNs).toBeDefined();
    expect(bnNs).toBeDefined();
    for (const key of KEYS) {
      expect(enNs?.[key]?.trim(), `en whatsNew.${key}`).toBeTruthy();
      expect(bnNs?.[key]?.trim(), `bn whatsNew.${key}`).toBeTruthy();
      expect(bnNs?.[key], `bn whatsNew.${key} is untranslated`).not.toBe(enNs?.[key]);
    }
  });

  it("has no keys in one language that the other lacks", () => {
    expect(Object.keys(bnNs ?? {}).sort()).toEqual(Object.keys(enNs ?? {}).sort());
  });

  it("keeps the {version} placeholder in both languages", () => {
    expect(enNs?.versionLabel).toContain("{version}");
    expect(bnNs?.versionLabel).toContain("{version}");
  });

  it("every whatsNew key the components ask for exists in both languages", () => {
    const used = new Set<string>();
    for (const { text } of SOURCES) {
      for (const m of text.matchAll(/\btWhatsNew\(\s*"(\w+)"/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(5);
    expect([...used].filter((k) => !(k in (enNs ?? {})))).toEqual([]);
    expect([...used].filter((k) => !(k in (bnNs ?? {})))).toEqual([]);
  });
});
