import type { ThemeDocument } from "./api";
import { pageSections } from "./document-ops";
import { categoryPaths, pathLocale, type CategoryNode } from "./preview-paths";

/*
 * Where a link setting can point.
 *
 * A stored link is a path with no language in it ("/categories/men/shirts"). The storefront
 * draws it through next-intl's Link, which puts the shopper's language in front; a path that
 * already carried one would send a Bangla shopper to the English page.
 *
 * The pages below are the ones every shop serves, so a merchant can pick one without typing.
 * A category is picked from the shop's own tree, and anything else is typed as a web address
 * and checked by the same rules the API uses.
 */

/** A page every shop has. `key` names it under `themeEditor`. */
export type LinkPage = { path: string; key: string };

/** The home page's product shelves. Only the shelves section carries that anchor. */
const PRODUCTS_ANCHOR = "/#products";
const SHELVES_SECTION = "category_products";

export const LINK_PAGES: readonly LinkPage[] = [
  { path: "/", key: "linkPageHome" },
  // The storefront's own "keep shopping" links go here.
  { path: PRODUCTS_ANCHOR, key: "linkPageProducts" },
  { path: "/search", key: "linkPageSearch" },
  { path: "/blog", key: "linkPageBlog" },
  { path: "/cart", key: "linkPageCart" },
  { path: "/checkout", key: "linkPageCheckout" },
  { path: "/support", key: "linkPageSupport" },
] as const;

/**
 * The pages this shop can be linked to now. "/#products" scrolls to the home page's product
 * shelves, so it is offered only while the home page still shows them: a merchant who takes
 * that section off would otherwise be handed a link that lands on home and scrolls nowhere.
 * A link picked earlier keeps its name, so a stored one still reads as the page it named.
 */
export function linkPages(document: ThemeDocument): readonly LinkPage[] {
  const shelves = pageSections(document, "templates.home").some(
    (section) => section.type === SHELVES_SECTION && !section.hidden,
  );
  return shelves ? LINK_PAGES : LINK_PAGES.filter((page) => page.path !== PRODUCTS_ANCHOR);
}

export type LinkTab = "pages" | "categories" | "web";

/** One category a link can point at, in tree order. */
export type CategoryLink = {
  /** The category's public id, which is what the category tree helpers key on. */
  id: string;
  /** "/categories/men/shirts". */
  path: string;
};

/**
 * Every active category as a link, by public id. A category switched off is left out along
 * with everything under it: the storefront would answer its address with a 404.
 */
export function categoryLinks(nodes: CategoryNode[]): Map<string, CategoryLink> {
  const out = new Map<string, CategoryLink>();
  for (const [id, { path }] of categoryPaths(nodes)) {
    out.set(id, { id, path: `/categories/${path}` });
  }
  return out;
}

/**
 * A typed path that already names a language ("/en/cart", "/bn"). The API stores it happily,
 * but the storefront draws every path through next-intl's Link and puts the shopper's own
 * language in front of it, so the shopper would land on "/en/en/cart". The merchant is told
 * to leave the language out instead.
 */
export function languageInPath(value: string): boolean {
  const link = value.trim();
  return link.startsWith("/") && pathLocale(link) !== null;
}

/** Which tab of the link picker a stored link belongs to, so it opens where the link was made. */
export function linkTab(value: string): LinkTab {
  const link = value.trim();
  if (!link) return "pages";
  if (LINK_PAGES.some((page) => page.path === link)) return "pages";
  if (link.startsWith("/categories/")) return "categories";
  return "web";
}
