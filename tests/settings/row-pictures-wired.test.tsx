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

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeManifest, ThemeSection, ThemeSettingSpec } from "@/lib/theme-editor/api";
import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import { tickedParts } from "@/lib/theme-editor/slot-sections";
import en from "../../messages/en.json";

const BESIDE = ["picture_on", "picture", "picture_heading", "picture_text", "picture_button"];
const url = (key: string) => `https://cdn.example.com/${key}`;
const DEPARTMENTS = [
  { value: "cat_men", label: "Men" },
  { value: "cat_women", label: "Women" },
  { value: "cat_kids", label: "Kids" },
];

const section = (type: string, settings: Record<string, unknown> = {}, blocks: ThemeSection["blocks"] = []) =>
  ({ id: type, type, hidden: false, settings, blocks }) as ThemeSection;

const draw = (slotKey: string, live: ThemeSection) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome
        page="home"
        slotKey={slotKey}
        variant={undefined}
        live={live}
        departments={DEPARTMENTS}
        pictureUrl={url}
      />
    </NextIntlClientProvider>,
  );

const WORDS = { picture: "tenants/s/themes/row.jpg", picture_heading: "New in", picture_text: "Just landed", picture_button: "Shop" };

describe("the rows' pictures on the canvas", () => {
  for (const [slotKey, type] of [
    ["featured", "featured_products"],
    ["bestsellers", "best_sellers"],
    ["arrivals", "new_arrivals"],
  ] as const) {
    test(`${slotKey}: beside the products, with the merchant's words`, () => {
      const html = draw(slotKey, section(type, WORDS));
      expect(html).toContain('data-row-picture="beside"');
      expect(html).toContain('src="https://cdn.example.com/tenants/s/themes/row.jpg"');
      for (const word of ["New in", "Just landed", "Shop"]) expect(html).toContain(word);
    });

    test(`${slotKey}: switched off, it is kept and not drawn`, () => {
      expect(draw(slotKey, section(type, { ...WORDS, picture_on: false }))).not.toContain("data-row-picture");
    });

    test(`${slotKey}: no picture, the row as before`, () => {
      expect(draw(slotKey, section(type, { picture_heading: "New in" }))).not.toContain("data-row-picture");
    });
  }

  test("a row saved before the switch existed draws its picture: a missing switch is on", () => {
    const { picture } = WORDS;
    expect(draw("bestsellers", section("best_sellers", { picture }))).toContain('data-row-picture="beside"');
  });

  test("the picture takes two products' room on a wide screen, and sits on top on a narrow one", () => {
    const html = draw("bestsellers", section("best_sellers", WORDS));
    expect(html).toMatch(/data-row-picture="beside" class="[^"]*col-span-2/);
    expect((html.match(/sm:hidden/g) ?? []).length).toBeGreaterThan(0);
  });

  test("the departments: a wide picture above all three, and each its own", () => {
    const live = section("category_products", { picture: "tenants/s/themes/top.jpg" }, [
      { id: "a", type: "band", settings: { category: "cat_men", picture: "tenants/s/themes/men.jpg" } },
      { id: "b", type: "band", settings: { category: "cat_women", picture: "tenants/s/themes/women.jpg", picture_on: false } },
      { id: "c", type: "band", settings: { category: "cat_kids" } },
    ]);
    const html = draw("bands", live);
    expect(html).toContain('data-row-picture="top"');
    expect(html.indexOf("top.jpg")).toBeLessThan(html.indexOf(">Men<"));
    expect(html).toContain("men.jpg");
    expect(html).not.toContain("women.jpg");
    expect((html.match(/data-row-picture="beside"/g) ?? []).length).toBe(1);
  });

  test("the departments' top picture switched off draws none", () => {
    const live = section("category_products", { picture: "tenants/s/themes/top.jpg", picture_on: false });
    expect(draw("bands", live)).not.toContain('data-row-picture="top"');
  });
});

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
