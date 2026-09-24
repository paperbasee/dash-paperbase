/**
 * A blog post, wired (2026-09-24).
 *
 * Six places are settings of the one `article_body` section; the seventh, More
 * posts, is the `article_related` section being there or not. The picture's
 * first tile said "Title only -- what your shop does today" while the shop drew
 * the picture under the title; that is the default now, named for what it is.
 *
 * And the drawing is the shop's own post: "How we choose leather", "By Nasrin
 * Akter" and tags called Care and Materials were a shop that does not exist.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { postWords } from "@/lib/theme-editor/post-words";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
import { ShopChrome, type BlogPreview, type PostPreview } from "@/components/theme-editor/slots/ShopChrome";
import en from "../../messages/en.json";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });
const choice = (id: string, options: string[], fallback: string) => ({
  id,
  type: "select",
  ...labels(id),
  options,
  default: fallback,
});
const flag = (id: string, fallback: boolean) => ({ id, type: "boolean", ...labels(id), default: fallback });

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    article_body: {
      ...labels("Post text"),
      required: true,
      settings: [
        flag("back", true),
        choice("picture", ["under", "top", "off"], "under"),
        choice("byline", ["date", "author", "none"], "date"),
        choice("width", ["narrow", "wide"], "narrow"),
        flag("tags", true),
        flag("prev_next", true),
      ],
    },
    article_related: { ...labels("More posts"), settings: [] },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {
    blog_article: { ...labels("Blog article"), sections: ["article_body", "article_related"], default: [] },
  },
} as unknown as ThemeManifest;

const section = (id: string, type: string, over: Partial<ThemeSection> = {}): ThemeSection => ({
  id,
  type,
  hidden: false,
  settings: {},
  blocks: [],
  ...over,
});

/** As every stored document holds it today: both sections, no settings. */
function editor(): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: {},
      header: { sections: [section("header", "header")] },
      footer: { sections: [section("footer", "footer")] },
      templates: {
        blog_article: {
          sections: [section("article-body", "article_body"), section("article-related", "article_related")],
        },
      },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("article", key)!;
const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "article", key }).reduce(editorReducer, state);
const bodyOf = (state: EditorState) => sectionOfType(state.document, place("back"), "article_body");

describe("the blog post page is wired", () => {
  test("every place on it is real", () => {
    for (const slot of SLOTS.article) {
      if (slot.inherited) continue;
      expect(wiringFor("article", slot.key), slot.key).toBeTruthy();
      expect(wiringFor("article", slot.key)!.page, slot.key).toBe("templates.blog_article");
    }
  });

  test("a document that has never been touched reads as the editor's defaults", () => {
    const document = editor().document;
    expect(slotValueFor(document, place("back"))).toBe("on");
    expect(slotValueFor(document, place("head"))).toBe("under");
    expect(slotValueFor(document, place("byline"))).toBe("date");
    expect(slotValueFor(document, place("body"))).toBe("narrow");
    expect(slotValueFor(document, place("tags"))).toBe("on");
    expect(slotValueFor(document, place("prevNext"))).toBe("on");
    expect(slotValueFor(document, place("related"))).toBe("on");
  });

  test("each choice writes its own setting", () => {
    const settings = (key: string, value: string) =>
      (bodyOf(pick(editor(), key, value))?.settings ?? {}) as Record<string, unknown>;
    expect(settings("back", "off").back).toBe(false);
    expect(settings("head", "top").picture).toBe("top");
    expect(settings("head", "off").picture).toBe("off");
    expect(settings("byline", "author").byline).toBe("author");
    expect(settings("body", "wide").width).toBe("wide");
    expect(settings("tags", "off").tags).toBe(false);
    expect(settings("prevNext", "off").prev_next).toBe(false);
  });

  test("switching a part off never hides the post itself", () => {
    for (const key of ["back", "head", "byline", "tags", "prevNext"]) {
      const off = (SLOTS.article.find((one) => one.key === key)!.options ?? []).at(-1)!.value;
      expect(bodyOf(pick(editor(), key, off))?.hidden, key).toBeFalsy();
    }
  });

  test("more posts off hides the shelf's section, and on brings it back", () => {
    const off = pick(editor(), "related", "off");
    expect(slotValueFor(off.document, place("related"))).toBe("off");
    expect(slotValueFor(pick(off, "related", "on").document, place("related"))).toBe("on");
  });

  test("the picture's first tile is what the shop draws, and says so", () => {
    const head = SLOTS.article.find((one) => one.key === "head")!;
    expect(head.initial).toBe("under");
    expect(head.options!.map((one) => one.value)).toEqual(["under", "top", "off"]);
    const under = head.options![0];
    expect((en.themeEditor.slots as Record<string, string>)[under.note!]).toContain("What your shop does today");
  });
});

const post = (title: string, over: Partial<PostPreview> = {}): PostPreview => ({
  title,
  excerpt: `${title}, in a line.`,
  tag: "Style guide",
  date: "Sep 15, 2026",
  reads: 3,
  featured: false,
  tags: ["Style guide"],
  pictured: true,
  author: "Mushfikur Rahman",
  words: [
    { kind: "p", text: "Rise, leg shape and fabric weight explained in two minutes." },
    { kind: "h", text: "What we have learned" },
  ],
  ...over,
});

/** Newest first, as the shop lists them. The canvas stands for the second. */
const BLOG: BlogPreview = {
  posts: [
    post("Five easy layers for monsoon evenings"),
    post("How to find your perfect denim fit"),
    post("Caring for cotton and linen", { tag: "Care and craft", tags: ["Care and craft"] }),
    post("Gift ideas for everyone on your list"),
  ],
  tags: ["Care and craft", "Style guide"],
};

function draw(slotKey: string, variant: string | undefined, blog: BlogPreview = BLOG) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome page="article" slotKey={slotKey} variant={variant} settings={{}} blog={blog} />
    </NextIntlClientProvider>,
  );
}

describe("the canvas draws this shop's own post", () => {
  test("nothing from a shop that does not exist", () => {
    const guilty: string[] = [];
    for (const slot of SLOTS.article) {
      if (slot.inherited) continue;
      for (const option of slot.options ?? []) {
        const html = draw(slot.key, option.value);
        for (const word of ["leather", "Nasrin", "journal", "Materials", "Care<", "tanner"]) {
          if (html.includes(word)) guilty.push(`${slot.key}=${option.value} says "${word}"`);
        }
      }
    }
    expect(guilty).toEqual([]);
  });

  test("its title, its tag and its picture where the merchant put it", () => {
    const under = draw("head", "under");
    expect(under).toContain("How to find your perfect denim fit");
    expect(under).toContain("Style guide");
    expect(under.indexOf("<h4")).toBeLessThan(under.indexOf("aspect-[16/9]"));
    const top = draw("head", "top");
    expect(top.indexOf("aspect-[21/8]")).toBeLessThan(top.indexOf("<h4"));
    expect(draw("head", "off")).not.toContain("aspect-");
  });

  test("a post with no picture shows its title only, as on the shop", () => {
    const bare = { ...BLOG, posts: BLOG.posts.map((one) => ({ ...one, pictured: false })) };
    expect(draw("head", "top", bare)).not.toContain("aspect-");
  });

  test("the writer's own name, and a word when the account has none", () => {
    expect(draw("byline", "author")).toContain("By Mushfikur Rahman · Sep 15, 2026");
    expect(draw("byline", "date")).not.toContain("Mushfikur");
    const nameless = { ...BLOG, posts: BLOG.posts.map((one) => ({ ...one, author: "" })) };
    const html = draw("byline", "author", nameless);
    expect(html).toContain("Sep 15, 2026");
    expect(html).toContain("has no name");
  });

  test("its own words, in a column or across the page", () => {
    expect(draw("body", "narrow")).toContain("Rise, leg shape");
    expect(draw("body", "narrow")).toContain("max-w-[34rem]");
    expect(draw("body", "wide")).not.toContain("max-w-[34rem]");
  });

  test("the posts either side of it, older on the left", () => {
    const html = draw("prevNext", "on");
    expect(html.indexOf("Previous post")).toBeLessThan(html.indexOf("Next post"));
    expect(html.indexOf("Caring for cotton")).toBeLessThan(html.indexOf("Five easy layers"));
  });

  test("more posts: the same tag first, three, never itself", () => {
    const html = draw("related", "on");
    expect(html).toContain("More posts");
    expect(html).not.toContain("How to find your perfect denim fit");
    expect(html.indexOf("Five easy layers")).toBeLessThan(html.indexOf("Caring for cotton"));
    expect(html.indexOf("Gift ideas")).toBeLessThan(html.indexOf("Caring for cotton"));
  });
});

describe("a post's words, read the way the shop reads them", () => {
  test("its blocks, as words", () => {
    expect(postWords("<p>One &amp; two.</p><h2>A <em>heading</em></h2><blockquote><p>Said.</p></blockquote>")).toEqual([
      { kind: "p", text: "One & two." },
      { kind: "h", text: "A heading" },
      { kind: "quote", text: "Said." },
    ]);
  });

  test("plain text: an empty line is a new paragraph", () => {
    expect(postWords("First line.\n\nSecond, and\na break.")).toEqual([
      { kind: "p", text: "First line." },
      { kind: "p", text: "Second, and a break." },
    ]);
  });

  test("only the first few", () => {
    expect(postWords("<p>1</p><p>2</p><p>3</p><p>4</p><p>5</p>")).toHaveLength(4);
  });
});
