/**
 * The blog page, wired (2026-09-24).
 *
 * Seven places are settings of the one `blog_list` section every document
 * holds; the eighth, words under the posts, is the `rich_text` section. Three
 * things were not as drawn: the shop showed ONE featured post large where the
 * editor said "four across", the read count only moved when a ten-minute cache
 * ran out, and the search box had a button that did nothing.
 *
 * And the drawings are the shop's own posts and tags now -- "Care" and
 * "Materials" were groups no merchant of ours ever made.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import {
  choiceEdits,
  ownerOf,
  sectionOfType,
  settingsClaimedElsewhere,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";
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
    blog_list: {
      ...labels("Blog posts"),
      settings: [
        flag("heading", true),
        { id: "title", type: "text", ...labels("title"), default: "" },
        { id: "intro", type: "textarea", ...labels("intro"), default: "" },
        flag("search", false),
        flag("tags", false),
        choice("featured", ["hero", "shelf", "off"], "hero"),
        choice("latest", ["grid", "rows"], "grid"),
        choice("cards", ["full", "picture", "words"], "full"),
        choice("meta", ["date", "reads", "none"], "date"),
      ],
    },
    rich_text: { ...labels("Text"), settings: [] },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: { blog: { ...labels("Blog"), sections: ["blog_list", "rich_text"], default: [] } },
} as unknown as ThemeManifest;

const section = (id: string, type: string, over: Partial<ThemeSection> = {}): ThemeSection => ({
  id,
  type,
  hidden: false,
  settings: {},
  blocks: [],
  ...over,
});

function editor(sections: ThemeSection[]): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: {},
      header: { sections: [section("header", "header")] },
      footer: { sections: [section("footer", "footer")] },
      templates: { blog: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("blog", key)!;
const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "blog", key }).reduce(editorReducer, state);
const settingsOf = (state: EditorState) =>
  (sectionOfType(state.document, place("heading"), "blog_list")?.settings ?? {}) as Record<string, unknown>;

/** As every stored document holds it today: the section, no settings. */
const PAGE = () => editor([section("blog-list", "blog_list")]);

describe("the blog page is wired", () => {
  test("every place on it is real", () => {
    for (const slot of SLOTS.blog) {
      if (slot.inheritedFrom) continue;
      expect(wiringFor("blog", slot.key), slot.key).toBeTruthy();
      expect(wiringFor("blog", slot.key)!.page, slot.key).toBe("templates.blog");
    }
  });

  test("a document that has never been touched reads as what the shop drew", () => {
    const document = PAGE().document;
    expect(slotValueFor(document, place("heading"))).toBe("on");
    expect(slotValueFor(document, place("search"))).toBe("off");
    expect(slotValueFor(document, place("tags"))).toBe("off");
    expect(slotValueFor(document, place("featured"))).toBe("hero");
    expect(slotValueFor(document, place("latest"))).toBe("grid");
    expect(slotValueFor(document, place("cards"))).toBe("full");
    expect(slotValueFor(document, place("meta"))).toBe("date");
    expect(slotValueFor(document, place("text"))).toBe("off");
  });

  test("each choice writes its own setting", () => {
    expect(settingsOf(pick(PAGE(), "heading", "off")).heading).toBe(false);
    expect(settingsOf(pick(PAGE(), "search", "on")).search).toBe(true);
    expect(settingsOf(pick(PAGE(), "tags", "row")).tags).toBe(true);
    expect(settingsOf(pick(PAGE(), "featured", "shelf")).featured).toBe("shelf");
    expect(settingsOf(pick(PAGE(), "latest", "rows")).latest).toBe("rows");
    expect(settingsOf(pick(PAGE(), "cards", "words")).cards).toBe("words");
    expect(settingsOf(pick(PAGE(), "meta", "reads")).meta).toBe("reads");
  });

  test("words under the posts add the text section, and the list stays", () => {
    const after = pick(PAGE(), "text", "block");
    const types = after.document.templates.blog.sections.map((one: ThemeSection) => one.type);
    expect(types).toEqual(["blog_list", "rich_text"]);
  });

  test("the defaults the tiles say are the shop's", () => {
    const featured = SLOTS.blog.find((one) => one.key === "featured")!;
    expect(featured.initial).toBe("hero");
    const hero = featured.options!.find((one) => one.value === "hero")!;
    expect((en.themeEditor.slots as Record<string, string>)[hero.note!]).toContain("What your shop does today");
    expect(SLOTS.blog.find((one) => one.key === "search")!.initial).toBe("off");
  });
});

describe("a place keeps its own words", () => {
  test("the blog's name and line belong to the heading and to no other place", () => {
    for (const slot of SLOTS.blog) {
      if (slot.inheritedFrom) continue;
      const claimed = settingsClaimedElsewhere("blog", "blog_list", ownerOf("blog", slot));
      if (slot.key === "heading") {
        expect(claimed.has("title"), slot.key).toBe(false);
      } else {
        expect(claimed.has("title") && claimed.has("intro"), slot.key).toBe(true);
      }
    }
  });

  test("the words said before paying are not drawn under the discount code", () => {
    const coupon = SLOTS.checkout.find((one) => one.key === "coupon")!;
    const claimed = settingsClaimedElsewhere("checkout", "checkout", ownerOf("checkout", coupon));
    expect(claimed.has("before_pay_text")).toBe(true);
    expect(claimed.has("trust_text")).toBe(true);
  });
});

