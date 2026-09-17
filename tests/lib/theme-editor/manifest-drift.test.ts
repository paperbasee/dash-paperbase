/**
 * The editor against the real theme files in api-paperbase (skipped when that repo is not
 * next to this one): every name a merchant reads has Bangla, every required section can
 * be placed somewhere, and a theme's own defaults pass the editor's rules, so a fresh
 * editor never opens on a page that already breaks them.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import type { ThemeManifest } from "@/lib/theme-editor/api";
import { editorPages, newSection, pageSpec } from "@/lib/theme-editor/document-ops";
import { cannotAdd, cannotHide } from "@/lib/theme-editor/rules";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const THEMES = path.resolve(ROOT, "../api-paperbase/engine/apps/theming/themes");
const files = fs.existsSync(THEMES) ? fs.readdirSync(THEMES).filter((f) => f.endsWith(".json")) : [];

const BANGLA = /[ঀ-৿]/;

type Defaults = { default: { id: string; type: string; hidden?: boolean }[] };

describe.skipIf(files.length === 0)("theme files in api-paperbase", () => {
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(THEMES, file), "utf8"));
    const manifest = raw as ThemeManifest;

    test(`${file}: every label has Bangla`, () => {
      const missing: string[] = [];
      const check = (entry: { label?: string; label_bn?: string }, where: string) => {
        if (!entry.label?.trim() || !BANGLA.test(entry.label_bn ?? "")) missing.push(where);
      };
      if (!BANGLA.test(manifest.name_bn ?? "")) missing.push("name_bn");
      for (const [type, spec] of Object.entries(manifest.sections)) {
        check(spec, `sections.${type}`);
        spec.settings.forEach((s) => check(s, `sections.${type}.settings.${s.id}`));
        for (const [blockType, block] of Object.entries(spec.blocks ?? {})) {
          check(block, `sections.${type}.blocks.${blockType}`);
          block.settings.forEach((s) => check(s, `sections.${type}.blocks.${blockType}.settings.${s.id}`));
        }
      }
      for (const page of editorPages(manifest)) check(pageSpec(manifest, page)!, page);
      expect(missing).toEqual([]);
    });

    test(`${file}: required sections have a place, and new copies keep their required blocks`, () => {
      const allowedSomewhere = new Set(editorPages(manifest).flatMap((p) => pageSpec(manifest, p)!.sections));
      for (const [type, spec] of Object.entries(manifest.sections)) {
        if (spec.required) expect(allowedSomewhere.has(type), type).toBe(true);
        const made = newSection(manifest, type, []);
        expect(made.blocks.map((b) => b.type), type).toEqual(spec.required_blocks ?? []);
      }
    });

    test(`${file}: the defaults pass the editor's rules`, () => {
      for (const page of editorPages(manifest)) {
        const spec = pageSpec(manifest, page)!;
        const defaults = (spec as unknown as Defaults).default.map((s) => ({
          id: s.id,
          type: s.type,
          hidden: s.hidden ?? false,
          settings: {},
          blocks: [],
        }));
        defaults.forEach((section, i) => {
          // Each default, added in order to the ones before it, is one the editor would allow.
          expect(cannotAdd(manifest, spec.sections, defaults.slice(0, i).filter((s) => !s.hidden), section.type), `${page} ${section.id}`).toBeNull();
        });
        for (const type of spec.sections) {
          if (!manifest.sections[type].required) continue;
          const shown = defaults.find((s) => s.type === type && !s.hidden);
          expect(shown, `${page} shows ${type}`).toBeDefined();
          expect(cannotHide(manifest, defaults, shown!)).toBe("required");
        }
      }
    });
  }
});
