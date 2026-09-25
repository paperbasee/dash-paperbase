import { apiErrorParts, EDITOR_REQUEST_TIMEOUT_MS, type ThemeHttp } from "./api";
import type { PageKey } from "./document-ops";

/*
 * Which page template a preview address draws, and an address that shows each template.
 *
 * Home, search, the blog list, the reviews page, the cart, the checkout, the wishlist and the
 * account page always exist -- the last four drawn in the preview from a sample of the shop's own
 * products, since a merchant looking at their draft has nothing in a cart (shop-paperbase
 * `storefront/preview_samples.py`, 2026-09-26). A category, a product and a blog post need one of
 * the shop's own, so the editor asks the dashboard API for one of each when it opens: the first
 * active category (one with products if there is one), the newest active product, and the newest
 * published post. Owner, Admin and Manager, the only members who can open the editor, can read all
 * three. A shop without one gets a plain note instead of a page.
 *
 * A read the API refuses (the blog switched off) means nothing to show. A read that gets no
 * answer (offline, a timeout, a 5xx) says nothing about the shop, so the whole fetch fails and is
 * tried again, rather than telling the merchant to add something the shop already has.
 */

export type PreviewExamples = {
  /** "/categories/men/shirts", or null when the shop has no active category. */
  category: string | null;
  /** "/products/men/shirts/blue-shirt", or null when the shop has no active product. */
  product: string | null;
  /** A word from a product's name for the search page, or null. */
  searchWord: string | null;
  /** "/blog/<slug>", or null when no post is published (or the blog is switched off). */
  post: string | null;
};

/** What the editor can show for a page: a preview address, or which thing the shop lacks. */
export type PreviewTarget =
  | { path: string }
  | { missing: "category" | "product" | "post" }
  /** Drawn on every page (header, footer) or not a page the preview knows: stay where it is. */
  | null;

const LOCALES = ["en", "bn"];

function segments(path: string): string[] {
  return (path.split(/[?#]/)[0] ?? "").split("/").filter(Boolean);
}

/** The storefront language a preview address is in, or null. */
export function pathLocale(path: string): string | null {
  const first = segments(path)[0];
  return first && LOCALES.includes(first) ? first : null;
}

/** The template a preview address draws, or null for a page themes don't draw (cart, checkout, about us...). */
export function templateForPath(path: string): PageKey | null {
  const parts = segments(path);
  if (!parts[0] || !LOCALES.includes(parts[0])) return null;
  const [first, second, ...rest] = parts.slice(1);
  if (first === undefined) return "templates.home";
  if (first === "categories" && second) return "templates.category";
  if (first === "products" && second) return "templates.product";
  if (first === "search" && !second) return "templates.search";
  if (first === "blog" && !second) return "templates.blog";
  if (first === "blog" && second && rest.length === 0) return "templates.blog_article";
  // One address each, nothing under it: /checkout/payment and /account/sign-in are other pages.
  if (second === undefined && first && SINGLE_PAGES[first]) return SINGLE_PAGES[first];
  return null;
}

/** The pages at one fixed address, by that address's only segment. */
const SINGLE_PAGES: Record<string, PageKey> = {
  reviews: "templates.reviews",
  wishlist: "templates.wishlist",
  account: "templates.account",
  cart: "templates.cart",
  checkout: "templates.checkout",
};

export function previewTarget(page: PageKey, examples: PreviewExamples, locale: string): PreviewTarget {
  const at = (path: string) => ({ path: `/${locale}${path}` });
  switch (page) {
    case "templates.home":
      return { path: `/${locale}` };
    case "templates.category":
      return examples.category ? at(examples.category) : { missing: "category" };
    case "templates.product":
      return examples.product ? at(examples.product) : { missing: "product" };
    case "templates.search":
      return at(examples.searchWord ? `/search?q=${encodeURIComponent(examples.searchWord)}` : "/search");
    case "templates.blog":
      return at("/blog");
    case "templates.blog_article":
      return examples.post ? at(examples.post) : { missing: "post" };
    case "templates.reviews":
      return at("/reviews");
    case "templates.wishlist":
      return at("/wishlist");
    case "templates.account":
      return at("/account");
    case "templates.cart":
      return at("/cart");
    case "templates.checkout":
      return at("/checkout");
    default:
      return null;
  }
}

export type CategoryNode = {
  public_id: string;
  slug: string;
  is_active: boolean;
  product_count: number;
  children?: CategoryNode[];
};

type ProductRow = { name: string; slug: string; category_public_id?: string };

type BlogRow = { slug: string; is_public: boolean; published_at: string | null };

const rows = <T>(data: unknown): T[] =>
  Array.isArray(data) ? data : ((data as { results?: T[] } | null)?.results ?? []);

/** Each active category's address under the storefront's /categories/, by public id. Inactive ones hide their children. */
export function categoryPaths(nodes: CategoryNode[], parent = "", out = new Map<string, { path: string; node: CategoryNode }>()) {
  for (const node of nodes) {
    if (!node.is_active || !node.slug) continue;
    const path = parent ? `${parent}/${node.slug}` : node.slug;
    out.set(node.public_id, { path, node });
    categoryPaths(node.children ?? [], path, out);
  }
  return out;
}

/** A word worth searching for: letters or digits, at least two of them. */
export function searchWord(name: string): string | null {
  for (const word of name.split(/\s+/)) {
    const clean = word.replace(/[^\p{L}\p{M}\p{N}]/gu, "");
    if ([...clean].length >= 2) return clean;
  }
  return null;
}

export async function fetchPreviewExamples(http: ThemeHttp, now = Date.now()): Promise<PreviewExamples> {
  const config = { timeout: EDITOR_REQUEST_TIMEOUT_MS };
  const reads = await Promise.allSettled([
    http.get<CategoryNode[]>("admin/categories/?tree=1", config),
    http.get<unknown>("admin/products/?status=active&page_size=1", config),
    http.get<unknown>("admin/blogs/", config),
  ]);
  for (const read of reads) {
    if (read.status !== "rejected") continue;
    const { status } = apiErrorParts(read.reason);
    if (status === undefined || status >= 500) throw read.reason;
  }
  const [categories, products, posts] = reads;

  const paths = categoryPaths(categories.status === "fulfilled" ? rows<CategoryNode>(categories.value.data) : []);
  const active = [...paths.values()];
  const category = active.find(({ node }) => node.product_count > 0) ?? active[0];

  const product = products.status === "fulfilled" ? rows<ProductRow>(products.value.data)[0] : undefined;
  const productCategory = product?.category_public_id ? paths.get(product.category_public_id) : undefined;

  const post =
    posts.status === "fulfilled"
      ? rows<BlogRow>(posts.value.data).find(
          (row) => row.is_public && row.published_at !== null && Date.parse(row.published_at) <= now,
        )
      : undefined;

  return {
    category: category ? `/categories/${category.path}` : null,
    // The storefront redirects /products/<slug> to the category address; going there directly saves a render.
    product: product?.slug
      ? `/products/${productCategory ? `${productCategory.path}/` : ""}${product.slug}`
      : null,
    searchWord: product ? searchWord(product.name) : null,
    post: post?.slug ? `/blog/${post.slug}` : null,
  };
}
