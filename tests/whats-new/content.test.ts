import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  WHATS_NEW_ENTRIES,
  WHATS_NEW_MAX_ENTRIES,
  WHATS_NEW_TAGS,
} from "@/content/whats-new";
import { SECTIONS } from "@/app/[locale]/(dashboard)/settings/settingsSections";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DASHBOARD_ROUTES = path.join(ROOT, "src/app/[locale]/(dashboard)");

const SEMVER = /^\d+\.\d+\.\d+$/;

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function isRealCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

describe("what's new content", () => {
  it("has at least one entry and no more than the documented cap", () => {
    expect(WHATS_NEW_MAX_ENTRIES).toBe(30);
    expect(WHATS_NEW_ENTRIES.length).toBeGreaterThan(0);
    expect(WHATS_NEW_ENTRIES.length).toBeLessThanOrEqual(WHATS_NEW_MAX_ENTRIES);
  });

  it("every entry has non-empty English and Bangla title and body", () => {
    for (const entry of WHATS_NEW_ENTRIES) {
      for (const lang of ["en", "bn"] as const) {
        expect(entry.title[lang]?.trim(), `${entry.id} title.${lang}`).toBeTruthy();
        expect(entry.body[lang]?.trim(), `${entry.id} body.${lang}`).toBeTruthy();
      }
      expect(entry.title.bn, `${entry.id} title.bn is untranslated`).not.toBe(entry.title.en);
      expect(entry.body.bn, `${entry.id} body.bn is untranslated`).not.toBe(entry.body.en);
    }
  });

  it("every entry has a valid tag", () => {
    for (const entry of WHATS_NEW_ENTRIES) {
      expect(WHATS_NEW_TAGS, entry.id).toContain(entry.tag);
    }
  });

  it("ids are unique, stable-looking and start with the entry date", () => {
    const ids = WHATS_NEW_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of WHATS_NEW_ENTRIES) {
      expect(entry.id).toMatch(/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(entry.id.startsWith(`${entry.date}-`), entry.id).toBe(true);
    }
  });

  it("dates are real YYYY-MM-DD calendar dates", () => {
    for (const entry of WHATS_NEW_ENTRIES) {
      expect(isRealCalendarDate(entry.date), `${entry.id} date ${entry.date}`).toBe(true);
    }
  });

  it("is sorted newest first", () => {
    for (let i = 1; i < WHATS_NEW_ENTRIES.length; i += 1) {
      const prev = WHATS_NEW_ENTRIES[i - 1];
      const cur = WHATS_NEW_ENTRIES[i];
      expect(prev.date >= cur.date, `${prev.id} before ${cur.id}`).toBe(true);
      expect(compareSemver(prev.version, cur.version) >= 0, `${prev.id} before ${cur.id}`).toBe(
        true,
      );
    }
  });

  it("versions look like semver", () => {
    for (const entry of WHATS_NEW_ENTRIES) {
      expect(entry.version, entry.id).toMatch(SEMVER);
    }
  });

  it("every href is an internal dashboard path with a real page", () => {
    const sectionIds = new Set<string>(SECTIONS.map((s) => s.id));
    for (const entry of WHATS_NEW_ENTRIES) {
      if (entry.href === undefined) continue;
      const href = entry.href;
      expect(href, entry.id).toMatch(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9_=&-]+)?$/);
      expect(href.startsWith("//"), entry.id).toBe(false);
      expect(/^\/(en|bn)(\/|$)/.test(href), `${entry.id} must not carry a locale`).toBe(false);

      const [pathname, query] = href.split("?");
      const dir = path.join(DASHBOARD_ROUTES, ...pathname.split("/").filter(Boolean));
      expect(fs.existsSync(dir) && fs.statSync(dir).isDirectory(), `${entry.id}: ${dir}`).toBe(
        true,
      );
      expect(fs.existsSync(path.join(dir, "page.tsx")), `${entry.id}: page.tsx in ${dir}`).toBe(
        true,
      );

      if (query) {
        const params = new URLSearchParams(query);
        expect([...params.keys()], entry.id).toEqual(["tab"]);
        expect(pathname, entry.id).toBe("/settings");
        expect(sectionIds.has(params.get("tab") ?? ""), `${entry.id} tab`).toBe(true);
      }
    }
  });

  it("merchant copy stays short", () => {
    for (const entry of WHATS_NEW_ENTRIES) {
      expect(entry.title.en.split(/\s+/).length, `${entry.id} title`).toBeLessThanOrEqual(9);
      const sentences = entry.body.en.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, `${entry.id} body`).toBeLessThanOrEqual(3);
      const bnSentences = entry.body.bn.split(/(?<=[।!?])\s+/).filter(Boolean);
      expect(bnSentences.length, `${entry.id} body.bn`).toBeLessThanOrEqual(3);
    }
  });

  it("announces the What's new panel itself", () => {
    const whatsNew = WHATS_NEW_ENTRIES.find((e) => e.id.endsWith("-whats-new-panel"));
    expect(whatsNew).toBeDefined();
    expect(whatsNew?.tag).toBe("new");
    expect(whatsNew?.href).toBeUndefined();
  });
});
