/**
 * Reading and building the document: page keys follow the API's error paths, new
 * sections are complete enough for the API to accept, and new ids are always valid
 * and unique within their list.
 */

import { describe, expect, test } from "vitest";

import {
  editorPages,
  localLabel,
  moveItem,
  newId,
  newSection,
  pageAtPath,
  pageSections,
  pageSpec,
  withPageSections,
} from "@/lib/theme-editor/document-ops";
import { document, manifest, section } from "./fixtures";

const API_ID = /^[A-Za-z0-9_-]{1,40}$/;

describe("pages", () => {
  test("templates in the theme's order, then header and footer", () => {
    expect(editorPages(manifest)).toEqual([
      "templates.home",
      "templates.product",
      "templates.notices",
      "header",
      "footer",
    ]);
  });

  test("each page reads its own list and spec", () => {
    const doc = document();
    expect(pageSections(doc, "header").map((s) => s.id)).toEqual(["announcement-bar", "header"]);
    expect(pageSections(doc, "templates.product").map((s) => s.id)).toEqual([
      "product-gallery",
      "product-details",
    ]);
    expect(pageSpec(manifest, "footer")?.sections).toEqual(["footer"]);
    expect(pageSpec(manifest, "templates.home")?.label).toBe("Home");
    expect(pageSpec(manifest, "templates.cart")).toBeNull();
    expect(pageSections(doc, "templates.cart")).toEqual([]);
  });

  test("writing a list copies only what changed", () => {
    const doc = document();
    const next = withPageSections(doc, "templates.home", []);
    expect(next.templates.home.sections).toEqual([]);
    expect(doc.templates.home.sections).toHaveLength(1);
    expect(next.templates.product).toBe(doc.templates.product);
    expect(next.header).toBe(doc.header);

    const group = withPageSections(doc, "footer", []);
    expect(group.footer.sections).toEqual([]);
    expect(group.templates).toBe(doc.templates);
  });

  test("labels follow the viewer's language, falling back to English", () => {
    expect(localLabel({ label: "Home", label_bn: "হোম" }, "bn")).toBe("হোম");
    expect(localLabel({ label: "Home", label_bn: "হোম" }, "en")).toBe("Home");
    expect(localLabel({ label: "Home", label_bn: " " }, "bn")).toBe("Home");
  });
});

describe("newId", () => {
  test("the type, then numbered when taken", () => {
    expect(newId("rich_text", [])).toBe("rich-text");
    expect(newId("rich_text", ["rich-text"])).toBe("rich-text-2");
    expect(newId("rich_text", ["rich-text", "rich-text-2", "rich-text-4"])).toBe("rich-text-3");
  });

  test("always an id the API accepts, even from an odd type", () => {
    const long = "a_very_long_section_type_name_from_some_future_theme";
    const taken: string[] = [];
    for (let i = 0; i < 12; i += 1) taken.push(newId(long, taken));
    expect(new Set(taken).size).toBe(12);
    for (const id of [...taken, newId("১২ বাংলা", []), newId("--", []), newId("a.b/c", [])]) {
      expect(id).toMatch(API_ID);
    }
    expect(newId("--", [])).toBe("section");
  });
});

describe("newSection", () => {
  test("shown, with every setting at its default", () => {
    expect(newSection(manifest, "announcement_bar", [])).toEqual({
      id: "announcement-bar",
      type: "announcement_bar",
      hidden: false,
      settings: { text: "", link: "" },
      blocks: [],
    });
  });

  test("with the blocks the theme requires, each with a valid id", () => {
    const made = newSection(manifest, "product_details", ["product-details"]);
    expect(made.id).toBe("product-details-2");
    expect(made.blocks).toEqual([
      { id: "title", type: "title", settings: {} },
      { id: "buy-buttons", type: "buy_buttons", settings: {} },
    ]);
  });
});

describe("moveItem", () => {
  const items = ["a", "b", "c", "d"];

  test("up, down, and clamped to the ends", () => {
    expect(moveItem(items, 2, 1)).toEqual(["a", "c", "b", "d"]);
    expect(moveItem(items, 0, 3)).toEqual(["b", "c", "d", "a"]);
    expect(moveItem(items, 3, 99)).toBe(items);
    expect(moveItem(items, 1, -5)).toEqual(["b", "a", "c", "d"]);
    expect(items).toEqual(["a", "b", "c", "d"]);
  });

  test("the same array when nothing moves", () => {
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, 7, 0)).toBe(items);
    const one = [section("x", "rich_text")];
    expect(moveItem(one, 0, 1)).toBe(one);
  });
});

describe("pageAtPath", () => {
  test("an API error path points at its page and section", () => {
    const doc = document();
    expect(pageAtPath(doc, "templates.product.sections[1].blocks[0].settings.text")).toEqual({
      page: "templates.product",
      section: doc.templates.product.sections[1],
    });
    expect(pageAtPath(doc, "header.sections[0].settings.link")).toEqual({
      page: "header",
      section: doc.header.sections[0],
    });
  });

  test("a page without a section, a section that is gone, or no page at all", () => {
    const doc = document();
    expect(pageAtPath(doc, "templates.home")).toEqual({ page: "templates.home", section: null });
    expect(pageAtPath(doc, "templates.home.sections[9].type")).toEqual({ page: "templates.home", section: null });
    expect(pageAtPath(doc, "settings.colors")).toBeNull();
    expect(pageAtPath(doc, "")).toBeNull();
  });
});
