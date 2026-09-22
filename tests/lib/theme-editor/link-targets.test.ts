import { describe, expect, it } from "vitest";

import { sectionContentPlace } from "@/lib/theme-editor/content-links";
import {
  LINK_PAGES,
  categoryLinks,
  languageInPath,
  linkPages,
  linkTab,
} from "@/lib/theme-editor/link-targets";
import { checkLink } from "@/lib/theme-editor/validate";
import type { CategoryNode } from "@/lib/theme-editor/preview-paths";

import { document, section } from "./fixtures";

const node = (
  public_id: string,
  slug: string,
  over: Partial<CategoryNode> = {},
): CategoryNode => ({ public_id, slug, is_active: true, product_count: 0, ...over });

describe("LINK_PAGES", () => {
  it("are paths with no language in them, which is what the storefront stores", () => {
    for (const page of LINK_PAGES) {
      expect(page.path.startsWith("/"), page.path).toBe(true);
      expect(page.path, page.path).not.toMatch(/^\/(en|bn)(\/|$)/);
    }
  });

  it("are links the API would store", () => {
    for (const page of LINK_PAGES) expect(checkLink(page.path), page.path).toBeNull();
  });

  it("are listed once each, and name themselves from the messages", () => {
    expect(new Set(LINK_PAGES.map((p) => p.path)).size).toBe(LINK_PAGES.length);
    expect(LINK_PAGES.every((p) => p.key.startsWith("linkPage"))).toBe(true);
  });
});

describe("linkPages", () => {
  const home = (sections: ReturnType<typeof section>[]) => {
    const doc = document();
    doc.templates.home.sections = sections;
    return doc;
  };
  const shelves = section("category-products", "category_products");
  const paths = (doc: ReturnType<typeof document>) => linkPages(doc).map((page) => page.path);

  it("offers the product shelves while the home page draws them", () => {
    expect(paths(home([shelves]))).toContain("/#products");
    expect(paths(home([shelves]))).toEqual(LINK_PAGES.map((page) => page.path));
  });

  it("drops them once the home page has none shown, so no link scrolls nowhere", () => {
    expect(paths(home([]))).not.toContain("/#products");
    expect(paths(home([{ ...shelves, hidden: true }]))).not.toContain("/#products");
    expect(paths(home([]))).toHaveLength(LINK_PAGES.length - 1);
  });

  it("leaves every other page alone", () => {
    expect(paths(home([]))).toEqual(LINK_PAGES.filter((p) => p.path !== "/#products").map((p) => p.path));
  });
});

describe("languageInPath", () => {
  it("catches a path that already names a language, which the storefront would name again", () => {
    for (const bad of ["/en", "/bn", "/en/cart", "/bn/categories/men", " /en/cart "]) {
      expect(languageInPath(bad), bad).toBe(true);
    }
  });

  it("leaves everything else alone", () => {
    for (const good of ["", "/", "/cart", "/english-classes", "/en-us/x", "https://example.com/en/x", "mailto:a@b.com"]) {
      expect(languageInPath(good), good).toBe(false);
    }
  });
});

describe("categoryLinks", () => {
  const tree: CategoryNode[] = [
    node("men", "men", {
      children: [node("shirts", "shirts"), node("hidden-kids", "kids", { is_active: false, children: [node("caps", "caps")] })],
    }),
    node("women", "women"),
    node("off", "off", { is_active: false }),
  ];

  it("builds the storefront's own address, without a language", () => {
    expect([...categoryLinks(tree).values()].map((c) => c.path)).toEqual([
      "/categories/men",
      "/categories/men/shirts",
      "/categories/women",
    ]);
  });

  it("leaves out a category switched off, and everything under it", () => {
    const links = categoryLinks(tree);
    expect(links.has("off")).toBe(false);
    expect(links.has("hidden-kids")).toBe(false);
    expect(links.has("caps")).toBe(false);
  });

  it("is keyed by public id, which is what the category tree helper gives back", () => {
    expect(categoryLinks(tree).get("shirts")).toEqual({ id: "shirts", path: "/categories/men/shirts" });
  });

  it("makes links the API would store", () => {
    for (const link of categoryLinks(tree).values()) expect(checkLink(link.path), link.path).toBeNull();
  });
});

describe("linkTab", () => {
  it("opens on the tab a stored link came from", () => {
    expect(linkTab("")).toBe("pages");
    expect(linkTab("/")).toBe("pages");
    expect(linkTab("/cart")).toBe("pages");
    expect(linkTab("/categories/men/shirts")).toBe("categories");
    expect(linkTab("https://example.com")).toBe("web");
    expect(linkTab("mailto:a@b.com")).toBe("web");
    // A path the picker does not offer is still something the merchant typed.
    expect(linkTab("/wishlist")).toBe("web");
  });
});

describe("sectionContentPlace", () => {
  it("points the sections that draw merchant content at where it is managed", () => {
    // Not the banners: since 2026-09-18 their pictures are the section's own, so it
    // points nowhere and the merchant never leaves the editor to place one.
    expect(sectionContentPlace("banner_slider")).toBeNull();
    /*
     * The header used to send a merchant to Promotions → CTA for its notice
     * line. That was the problem this change fixed: the line was merchant
     * content living in Settings while an `announcement_bar` section sat in
     * the editor doing the same job. There is one bar now and it IS a section,
     * so there is nowhere else to send anybody.
     */
    expect(sectionContentPlace("header")).toBeNull();
    expect(sectionContentPlace("footer")?.key).toBe("contentStore");
  });

  it("says nothing about a section whose own settings are all of it", () => {
    expect(sectionContentPlace("announcement_bar")).toBeNull();
    expect(sectionContentPlace("rich_text")).toBeNull();
    expect(sectionContentPlace("not_a_section")).toBeNull();
  });
});
