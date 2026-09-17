/**
 * The page picker and the preview agree on which template an address draws, and each page of
 * the theme gets an address with something real on it, or a plain "the shop has none".
 */

import { describe, expect, test } from "vitest";

import { EDITOR_REQUEST_TIMEOUT_MS, type ThemeHttp } from "@/lib/theme-editor/api";
import {
  fetchPreviewExamples,
  pathLocale,
  previewTarget,
  searchWord,
  templateForPath,
  type PreviewExamples,
} from "@/lib/theme-editor/preview-paths";

describe("templateForPath", () => {
  test("each template's address", () => {
    expect(templateForPath("/en")).toBe("templates.home");
    expect(templateForPath("/bn/")).toBe("templates.home");
    expect(templateForPath("/en/categories/men")).toBe("templates.category");
    expect(templateForPath("/en/categories/men/shirts")).toBe("templates.category");
    expect(templateForPath("/bn/products/men/shirts/blue-shirt")).toBe("templates.product");
    expect(templateForPath("/en/search?q=shirt")).toBe("templates.search");
    expect(templateForPath("/en/blog")).toBe("templates.blog");
    expect(templateForPath("/en/blog/summer-sale")).toBe("templates.blog_article");
  });

  test("pages themes don't draw are null", () => {
    for (const path of [
      "/en/cart",
      "/en/checkout",
      "/en/checkout/payment",
      "/en/about-us",
      "/en/categories",
      "/en/products",
      "/en/blog/a/b",
      "/fr",
      "/",
      "",
    ]) {
      expect(templateForPath(path)).toBeNull();
    }
  });

  test("the language is the first segment", () => {
    expect(pathLocale("/bn/products/x")).toBe("bn");
    expect(pathLocale("/en")).toBe("en");
    expect(pathLocale("/api/preview/expired")).toBeNull();
  });
});

describe("previewTarget", () => {
  const all: PreviewExamples = {
    category: "/categories/men",
    product: "/products/men/blue-shirt",
    searchWord: "শার্ট",
    post: "/blog/summer-sale",
  };
  const none: PreviewExamples = { category: null, product: null, searchWord: null, post: null };

  test("an address in the frame's language for every template", () => {
    expect(previewTarget("templates.home", all, "bn")).toEqual({ path: "/bn" });
    expect(previewTarget("templates.category", all, "en")).toEqual({ path: "/en/categories/men" });
    expect(previewTarget("templates.product", all, "en")).toEqual({ path: "/en/products/men/blue-shirt" });
    expect(previewTarget("templates.search", all, "bn")).toEqual({
      path: `/bn/search?q=${encodeURIComponent("শার্ট")}`,
    });
    expect(previewTarget("templates.blog", all, "en")).toEqual({ path: "/en/blog" });
    expect(previewTarget("templates.blog_article", all, "en")).toEqual({ path: "/en/blog/summer-sale" });
  });

  test("a shop with nothing to show says what it lacks; home, search and the blog list always exist", () => {
    expect(previewTarget("templates.category", none, "en")).toEqual({ missing: "category" });
    expect(previewTarget("templates.product", none, "en")).toEqual({ missing: "product" });
    expect(previewTarget("templates.blog_article", none, "en")).toEqual({ missing: "post" });
    expect(previewTarget("templates.home", none, "en")).toEqual({ path: "/en" });
    expect(previewTarget("templates.search", none, "en")).toEqual({ path: "/en/search" });
    expect(previewTarget("templates.blog", none, "en")).toEqual({ path: "/en/blog" });
  });

  test("the header and footer stay on whatever page is showing", () => {
    expect(previewTarget("header", all, "en")).toBeNull();
    expect(previewTarget("footer", all, "en")).toBeNull();
    expect(previewTarget("templates.lookbook", all, "en")).toBeNull();
  });
});

test("searchWord takes the first real word", () => {
  expect(searchWord("Blue shirt")).toBe("Blue");
  expect(searchWord("- A Premium tee")).toBe("Premium");
  expect(searchWord("শার্ট (নীল)")).toBe("শার্ট");
  expect(searchWord("! ?")).toBeNull();
});

/** Answers each path; a missing path is refused (403), an Error answer is thrown as it is. */
function fakeHttp(answers: Record<string, unknown>) {
  const calls: string[] = [];
  const timeouts: (number | undefined)[] = [];
  const http: ThemeHttp = {
    async get<T>(path: string, config?: { timeout?: number }) {
      calls.push(path);
      timeouts.push(config?.timeout);
      if (!(path in answers)) throw Object.assign(new Error("HTTP 403"), { status: 403 });
      if (answers[path] instanceof Error) throw answers[path];
      return { data: answers[path] as T };
    },
    async post() {
      throw new Error("not used");
    },
  };
  return { http, calls, timeouts };
}

const node = (public_id: string, slug: string, over: Record<string, unknown> = {}) => ({
  public_id,
  slug,
  is_active: true,
  product_count: 0,
  children: [],
  ...over,
});

describe("fetchPreviewExamples", () => {
  const NOW = Date.parse("2026-09-17T12:00:00Z");

  test("one active category with products, the newest product under its category address, a published post", async () => {
    const { http, calls, timeouts } = fakeHttp({
      "admin/categories/?tree=1": [
        node("cat_hidden", "hidden", { is_active: false, product_count: 5, children: [node("cat_under", "under", { product_count: 9 })] }),
        node("cat_empty", "empty"),
        node("cat_men", "men", { children: [node("cat_shirts", "shirts", { product_count: 3 })] }),
      ],
      "admin/products/?status=active&page_size=1": {
        results: [{ name: "Blue shirt", slug: "blue-shirt", category_public_id: "cat_shirts" }],
      },
      "admin/blogs/": {
        results: [
          { slug: "draft", is_public: true, published_at: null },
          { slug: "private", is_public: false, published_at: "2026-09-01T00:00:00Z" },
          { slug: "tomorrow", is_public: true, published_at: "2026-09-18T00:00:00Z" },
          { slug: "summer-sale", is_public: true, published_at: "2026-09-10T00:00:00Z" },
        ],
      },
    });
    await expect(fetchPreviewExamples(http, NOW)).resolves.toEqual({
      category: "/categories/men/shirts",
      product: "/products/men/shirts/blue-shirt",
      searchWord: "Blue",
      post: "/blog/summer-sale",
    });
    expect(calls).toHaveLength(3);
    expect(timeouts).toEqual([EDITOR_REQUEST_TIMEOUT_MS, EDITOR_REQUEST_TIMEOUT_MS, EDITOR_REQUEST_TIMEOUT_MS]);
  });

  test("a product whose category isn't shown uses the address the storefront redirects", async () => {
    const { http } = fakeHttp({
      "admin/categories/?tree=1": [node("cat_men", "men")],
      "admin/products/?status=active&page_size=1": [{ name: "Tee", slug: "tee", category_public_id: "cat_gone" }],
      "admin/blogs/": [],
    });
    const examples = await fetchPreviewExamples(http, NOW);
    expect(examples.category).toBe("/categories/men");
    expect(examples.product).toBe("/products/tee");
    expect(examples.searchWord).toBe("Tee");
  });

  test("an empty shop, or reads the API refuses (the blog switched off), have nothing to show", async () => {
    const { http } = fakeHttp({
      "admin/categories/?tree=1": [],
      "admin/products/?status=active&page_size=1": { results: [] },
    });
    await expect(fetchPreviewExamples(http, NOW)).resolves.toEqual({
      category: null,
      product: null,
      searchWord: null,
      post: null,
    });
    await expect(fetchPreviewExamples(fakeHttp({}).http, NOW)).resolves.toEqual({
      category: null,
      product: null,
      searchWord: null,
      post: null,
    });
  });

  test("a read with no answer (offline, a timeout, a 5xx) fails the fetch instead of saying the shop has none", async () => {
    const shop = {
      "admin/categories/?tree=1": [node("cat_men", "men", { product_count: 2 })],
      "admin/products/?status=active&page_size=1": [{ name: "Tee", slug: "tee", category_public_id: "cat_men" }],
      "admin/blogs/": [],
    };
    const offline = new Error("Failed to fetch");
    const serverError = Object.assign(new Error("HTTP 502"), { status: 502 });
    await expect(
      fetchPreviewExamples(fakeHttp({ ...shop, "admin/products/?status=active&page_size=1": offline }).http, NOW),
    ).rejects.toBe(offline);
    await expect(fetchPreviewExamples(fakeHttp({ ...shop, "admin/blogs/": serverError }).http, NOW)).rejects.toBe(
      serverError,
    );
  });
});
