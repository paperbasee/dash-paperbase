/**
 * The editor refuses exactly what the API's documents.py refuses: a required section
 * keeps one shown copy, a single-use section has one shown copy (hidden ones don't
 * count), a list holds 40 sections and a section 30 blocks, and only allowed types.
 */

import { describe, expect, test } from "vitest";

import {
  MAX_BLOCKS_PER_SECTION,
  MAX_SECTIONS_PER_LIST,
  cannotAdd,
  cannotAddBlock,
  cannotHide,
  cannotRemove,
  cannotShow,
} from "@/lib/theme-editor/rules";
import { manifest, section } from "./fixtures";

const product = manifest.templates.product.sections;

describe("cannotAdd", () => {
  test("an allowed section on a page with room", () => {
    expect(cannotAdd(manifest, product, [], "rich_text")).toBeNull();
  });

  test("a section the page does not allow, or the theme does not have", () => {
    expect(cannotAdd(manifest, product, [], "banner_slider")).toBe("notAllowed");
    expect(cannotAdd(manifest, ["mystery"], [], "mystery")).toBe("notAllowed");
  });

  test("a single-use section counts shown copies only", () => {
    expect(cannotAdd(manifest, product, [section("g", "product_gallery")], "product_gallery")).toBe("onlyOnce");
    expect(
      cannotAdd(manifest, product, [section("g", "product_gallery", { hidden: true })], "product_gallery"),
    ).toBeNull();
  });

  test("a section that may repeat can be added again", () => {
    expect(cannotAdd(manifest, product, [section("t", "rich_text")], "rich_text")).toBeNull();
  });

  test("40 sections fill a list, hidden ones included", () => {
    const full = Array.from({ length: MAX_SECTIONS_PER_LIST }, (_, i) =>
      section(`t${i}`, "rich_text", { hidden: i % 2 === 0 }),
    );
    expect(cannotAdd(manifest, product, full, "rich_text")).toBe("listFull");
    expect(cannotAdd(manifest, product, full.slice(1), "rich_text")).toBeNull();
  });
});

describe("hide and remove", () => {
  test("any optional section can be hidden or removed", () => {
    const text = section("t", "rich_text");
    expect(cannotHide(manifest, [text], text)).toBeNull();
    expect(cannotRemove(manifest, [text], text)).toBeNull();
  });

  test("the shown copy of a required section can be neither", () => {
    const details = section("d", "product_details");
    expect(cannotHide(manifest, [details], details)).toBe("required");
    expect(cannotRemove(manifest, [details], details)).toBe("required");
  });

  test("a hidden copy of a required section can be removed", () => {
    const shown = section("d", "product_details");
    const spare = section("d2", "product_details", { hidden: true });
    expect(cannotRemove(manifest, [shown, spare], spare)).toBeNull();
    expect(cannotHide(manifest, [shown, spare], spare)).toBeNull();
  });

  test("a required section that may repeat keeps at least one shown copy", () => {
    const a = section("a", "notice");
    const b = section("b", "notice");
    expect(cannotHide(manifest, [a, b], a)).toBeNull();
    expect(cannotRemove(manifest, [a, b], b)).toBeNull();
    expect(cannotHide(manifest, [a, { ...b, hidden: true }], a)).toBe("required");
  });
});

describe("cannotShow", () => {
  test("a hidden single-use section waits while another copy is shown", () => {
    const shown = section("g", "product_gallery");
    const spare = section("g2", "product_gallery", { hidden: true });
    expect(cannotShow(manifest, [shown, spare], spare)).toBe("onlyOnce");
    expect(cannotShow(manifest, [{ ...shown, hidden: true }, spare], spare)).toBeNull();
  });

  test("a section that may repeat can always be shown", () => {
    const spare = section("t", "rich_text", { hidden: true });
    expect(cannotShow(manifest, [section("t0", "rich_text"), spare], spare)).toBeNull();
  });
});

describe("cannotAddBlock", () => {
  test("only the section's own blocks, and 30 at most", () => {
    const details = section("d", "product_details");
    expect(cannotAddBlock(manifest, details, "custom_text")).toBeNull();
    expect(cannotAddBlock(manifest, details, "gallery")).toBe("notAllowed");
    expect(cannotAddBlock(manifest, section("t", "rich_text"), "custom_text")).toBe("notAllowed");
    const blocks = Array.from({ length: MAX_BLOCKS_PER_SECTION }, (_, i) => ({
      id: `b${i}`,
      type: "custom_text",
      settings: {},
    }));
    expect(cannotAddBlock(manifest, { ...details, blocks }, "custom_text")).toBe("blocksFull");
  });
});
