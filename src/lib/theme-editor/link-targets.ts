import { categoryPaths, pathLocale, type CategoryNode } from "./preview-paths";

/*
 * Where a link setting can point.
 *
 * A stored link is a path with no language in it ("/categories/men/shirts"). The shop draws
 * it through its `shop_link` filter, which puts the shopper's language in front (the old
 * storefront did the same with next-intl's Link); a path that already carried one would send
 * a Bangla shopper to the English page.
 *
 * The pages below are the ones every shop serves, so a merchant can pick one without typing.
 * A category is picked from the shop's own tree, and anything else is typed as a web address
 * and checked by the same rules the API uses.
 */

/** A page every shop has. `key` names it under `themeEditor`. */
export type LinkPage = { path: string; key: string };

export const LINK_PAGES: readonly LinkPage[] = [
  { path: "/", key: "linkPageHome" },
  // The shop's own page of every product. It was "/#products" -- the old storefront's home
  // page shelves, an anchor this shop does not have -- so a merchant who picked "All
  // products" sent shoppers to the home page (owner, 2026-09-25). `theming/0038` moved the
  // links already saved.
  { path: "/products", key: "linkPageProducts" },
  // The shop's own pages of the newest and the best-selling, the home page
  // bands' "see all" -- a header menu's usual first links (2026-09-25).
  { path: "/new-arrivals", key: "linkPageNewArrivals" },
  { path: "/best-sellers", key: "linkPageBestSellers" },
  { path: "/brands", key: "linkPageBrands" },
  { path: "/search", key: "linkPageSearch" },
  { path: "/blog", key: "linkPageBlog" },
  { path: "/cart", key: "linkPageCart" },
  { path: "/checkout", key: "linkPageCheckout" },
  { path: "/support", key: "linkPageSupport" },
] as const;

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

/** A category as a menu link names it: its own name, and whether categories sit inside it. */
/**
 * `stocked`: something is in it or under it. The shop's menus leave an empty
 * category out (2026-09-25), and a panel opens only where something inside is
 * stocked -- `product_count` is rolled up through the categories inside.
 */
export type CategoryEntry = { name: string; opens: boolean; stocked: boolean };

type NamedCategoryNode = CategoryNode & { name: string; children?: NamedCategoryNode[] };

/**
 * Every active category by the link a merchant would store for it
 * ("/categories/men/shirts"), in tree order -- so the editor's drawing of the
 * header's menu can name a category link the merchant wrote no words for, and
 * mark the ones that open a panel, as the shop does.
 */
export function categoryIndex(nodes: NamedCategoryNode[]): Record<string, CategoryEntry> {
  const byId = new Map<string, NamedCategoryNode>();
  const walk = (list: NamedCategoryNode[]) =>
    list.forEach((node) => {
      byId.set(node.public_id, node);
      walk(node.children ?? []);
    });
  walk(nodes);
  const out: Record<string, CategoryEntry> = {};
  for (const [id, link] of categoryLinks(nodes)) {
    const node = byId.get(id);
    if (node) {
      out[link.path] = {
        name: node.name,
        opens: (node.children ?? []).some((child) => child.is_active && child.product_count > 0),
        stocked: node.product_count > 0,
      };
    }
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
