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

import type { ThemeManifest, ThemeSettingSpec } from "@/lib/theme-editor/api";
import { editorPages, newSection, pageSpec } from "@/lib/theme-editor/document-ops";
import { FIELD_KINDS, fieldSpecs } from "@/lib/theme-editor/field-specs";
import { cannotAdd, cannotHide } from "@/lib/theme-editor/rules";
import { placeParts, sectionTypesOf, WIRED_SLOTS } from "@/lib/theme-editor/slot-sections";
import { checkField } from "@/lib/theme-editor/validate";

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

    test(`${file}: every setting is a field the panel can draw, at a value it would store`, () => {
      const everySetting: { where: string; spec: ThemeSettingSpec }[] = [
        ...manifest.settings.map((spec) => ({ where: "settings", spec })),
      ];
      for (const [type, section] of Object.entries(manifest.sections)) {
        for (const spec of section.settings) everySetting.push({ where: `sections.${type}`, spec });
        for (const [blockType, block] of Object.entries(section.blocks ?? {})) {
          for (const spec of block.settings) {
            everySetting.push({ where: `sections.${type}.blocks.${blockType}`, spec });
          }
        }
      }
      // A theme that one day ships a kind this dashboard cannot draw would silently lose the
      // field, so the drift shows up here rather than as an empty panel a merchant reports.
      const undrawable = everySetting.filter(({ spec }) => !(FIELD_KINDS as readonly string[]).includes(spec.type));
      expect(undrawable.map((s) => `${s.where}.${s.spec.id}: ${s.spec.type}`)).toEqual([]);

      for (const { where, spec } of everySetting) {
        const [field] = fieldSpecs([spec], "bn");
        expect(field, `${where}.${spec.id}`).toBeDefined();
        // The theme's own default is the value an untouched field holds and the one the API
        // fills in, so the editor has to be willing to store it.
        expect(checkField(field, spec.default), `${where}.${spec.id}`).toBeNull();
        if (field.kind === "select") {
          expect(field.options.length, `${where}.${spec.id}`).toBeGreaterThan(0);
          // Every choice is named, so no merchant reads a raw value like "center".
          expect(field.options.filter((o) => o.label === o.value), `${where}.${spec.id}`).toEqual([]);
        }
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

    /*
     * Several boxes share one section -- the Logo, Design, Sticky and Menu boxes
     * are all the header -- and only one of them owns its parts. Guessing gave
     * every one of them the menu's "Add a link" (owner, 2026-09-26), and the
     * empty link one press made took every category off the shop's menu.
     */
    test(`${file}: a section's parts are edited by exactly one box`, () => {
      const owners: Record<string, string[]> = {};
      for (const [page, places] of Object.entries(WIRED_SLOTS)) {
        for (const [key, wiring] of Object.entries(places ?? {})) {
          for (const type of sectionTypesOf(wiring)) {
            const kinds = Object.keys(manifest.sections[type]?.blocks ?? {});
            if (kinds.length === 0) continue;
            const stub = { id: type, type, hidden: false, settings: {}, blocks: [] };
            owners[type] ??= [];
            if (placeParts(stub, kinds, wiring).blockType) owners[type].push(`${page}:${key}`);
          }
        }
      }
      expect(Object.keys(owners).length).toBeGreaterThan(0);
      for (const [type, places] of Object.entries(owners)) expect(places, type).toHaveLength(1);
      expect(owners.header).toEqual(["header:menu"]);
      expect(owners.footer).toEqual(["footer:columns"]);
    });
  }
});
