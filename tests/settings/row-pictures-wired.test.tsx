/**
 * A picture at the start of the home page's product rows (owner, 2026-09-26).
 *
 * Featured, best sellers, new arrivals and each of the three departments can
 * open with the merchant's own picture and words -- beside the products on a
 * wide screen, on top of them on a narrow one -- and the departments' area can
 * carry one wide picture above all three. Every picture has a switch that
 * hides it and keeps it. The departments are still TICKED: under the list,
 * each ticked one takes its own picture.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import type { ThemeManifest, ThemeSettingSpec } from "@/lib/theme-editor/api";
import { tickedParts } from "@/lib/theme-editor/slot-sections";

const BESIDE = ["picture_on", "picture", "picture_heading", "picture_text", "picture_button"];
const spec = (id: string, type: string): ThemeSettingSpec =>
  ({ id, type, label: id, label_bn: id, default: "" }) as ThemeSettingSpec;

describe("ticked, with details", () => {
  test("a department is ticked, and its picture is its details", () => {
    const band = [spec("category", "category"), ...BESIDE.map((id) => spec(id, id === "picture_on" ? "boolean" : "text"))];
    expect(tickedParts(band)).toEqual({ setting: "category", kind: "category", details: BESIDE });
  });

  test("a featured product is ticked and has none", () => {
    expect(tickedParts([spec("product", "product")])).toEqual({ setting: "product", kind: "product", details: [] });
  });

  test("a hero picture is a form, not a tick", () => {
    expect(tickedParts([spec("image", "image"), spec("link", "url")])).toBeNull();
    expect(tickedParts(undefined)).toBeNull();
  });
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const THEME = path.resolve(ROOT, "../api-paperbase/engine/apps/theming/themes/storefront.json");

describe.skipIf(!fs.existsSync(THEME))("against the real theme", () => {
  const manifest = JSON.parse(fs.readFileSync(THEME, "utf8")) as ThemeManifest;

  test("the departments stay ticked, each with its own picture", () => {
    const band = manifest.sections.category_products.blocks?.band?.settings;
    expect(tickedParts(band)).toEqual({ setting: "category", kind: "category", details: BESIDE });
  });

  test("the featured picks and the promises stay plain ticks", () => {
    expect(tickedParts(manifest.sections.featured_products.blocks?.product?.settings)?.details).toEqual([]);
    expect(tickedParts(manifest.sections.promises.blocks?.promise?.settings)?.details).toEqual([]);
  });
});

