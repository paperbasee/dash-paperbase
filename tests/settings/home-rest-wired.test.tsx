/**
 * The rest of the home page, wired (2026-09-24).
 *
 * Brands, customer reviews, the newest posts, the WhatsApp sign-up and the
 * questions. A "Video" place is gone: it was the `video` section the hero's
 * Video choice already owns. The sign-up lost its Email choice with the email
 * newsletter. And the drawing is the shop's own -- "Nusrat J.", six grey logos
 * and three invented posts were nobody's shop.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SIGNUP_TARGETS } from "@/lib/storeSocialLinks";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });
const heading = { id: "heading", type: "text", ...labels("Heading"), default: "" };

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    banner_slider: { ...labels("Banners"), settings: [] },
    category_products: { ...labels("Products by category"), settings: [] },
    brand_row: { ...labels("Brands"), settings: [heading] },
    review_highlights: {
      ...labels("Customer reviews"),
      premium: true,
      settings: [
        { id: "layout", type: "select", ...labels("Shape"), options: ["cards", "quote"], default: "cards" },
        heading,
      ],
    },
    latest_posts: { ...labels("From the blog"), settings: [heading] },
    whatsapp: {
      ...labels("Sign-up"),
      settings: [
        {
          id: "platform",
          type: "select",
          ...labels("Where the button goes"),
          options: ["whatsapp", "messenger", "facebook", "instagram", "tiktok"],
          default: "whatsapp",
        },
        heading,
        { id: "body", type: "textarea", ...labels("Line"), default: "" },
        { id: "button_label", type: "text", ...labels("Button"), default: "" },
      ],
    },
    faq: {
      ...labels("Questions"),
      settings: [heading],
      blocks: {
        question: {
          ...labels("Question"),
          settings: [
            { id: "question", type: "text", ...labels("Question"), default: "" },
            { id: "answer", type: "textarea", ...labels("Answer"), default: "" },
          ],
        },
      },
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {
    home: {
      ...labels("Home"),
      sections: ["banner_slider", "category_products", "brand_row", "review_highlights", "latest_posts", "whatsapp", "faq"],
      default: [],
    },
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

/** A home page as most shops hold it: the hero and the departments. */
function editor(): EditorState {
  return initEditorState({
    document: {
      theme: "storefront",
      settings: {},
      header: { sections: [section("header", "header")] },
      footer: { sections: [section("footer", "footer")] },
      templates: {
        home: { sections: [section("banner-slider", "banner_slider"), section("category-products", "category_products")] },
      },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const PLACES = ["brands", "reviews", "posts", "signup", "faq"];
const place = (key: string) => wiringFor("home", key)!;
const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "home", key }).reduce(editorReducer, state);
const types = (state: EditorState) => state.document.templates.home.sections.map((one: ThemeSection) => one.type);

describe("the rest of the home page is wired", () => {
  test("every place on the home page is real now", () => {
    for (const slot of SLOTS.home) {
      if (slot.inheritedFrom) continue;
      expect(wiringFor("home", slot.key), slot.key).toBeTruthy();
    }
  });

  test("the video place is gone: the hero owns the video section", () => {
    expect(SLOTS.home.map((one) => one.key)).not.toContain("video");
    expect(wiringFor("home", "hero")!.sections.video).toBe("video");
  });

  test("the sign-up goes to the account chosen, or nowhere (2026-09-26; every platform since 2026-09-29)", () => {
    const signup = SLOTS.home.find((one) => one.key === "signup")!;
    expect(signup.options!.map((one) => one.value)).toEqual([...SIGNUP_TARGETS, "off"]);
    // Each platform's tile is its own logo.
    for (const option of signup.options!.filter((one) => one.value !== "off")) {
      expect(option.platform, option.value).toBe(option.value);
    }
  });

  test("a platform is the band's setting, and a band saved before it reads as WhatsApp", () => {
    const state = pick(editor(), "signup", "instagram");
    expect(sectionOfType(state.document, place("signup"), "whatsapp")!.settings.platform).toBe("instagram");
    expect(slotValueFor(state.document, place("signup"))).toBe("instagram");

    const older = pick(editor(), "signup", "whatsapp");
    delete sectionOfType(older.document, place("signup"), "whatsapp")!.settings.platform;
    expect(slotValueFor(older.document, place("signup"))).toBe("whatsapp");
  });

  test("a page without them reads as off", () => {
    for (const key of PLACES) expect(slotValueFor(editor().document, place(key)), key).toBe("off");
  });

  test("each one adds its own section, in the editor's order", () => {
    let state = editor();
    state = pick(state, "faq", "on");
    state = pick(state, "brands", "row");
    state = pick(state, "signup", "whatsapp");
    state = pick(state, "posts", "three");
    state = pick(state, "reviews", "quote");
    expect(types(state)).toEqual([
      "banner_slider",
      "category_products",
      "brand_row",
      "review_highlights",
      "latest_posts",
      "whatsapp",
      "faq",
    ]);
    const reviews = sectionOfType(state.document, place("reviews"), "review_highlights");
    expect(reviews?.settings.layout).toBe("quote");
    for (const key of PLACES) expect(slotValueFor(state.document, place(key)), key).not.toBe("off");
  });

  test("off hides a band rather than removing it, so its words wait", () => {
    const on = pick(editor(), "brands", "row");
    const off = pick(on, "brands", "off");
    expect(sectionOfType(off.document, place("brands"), "brand_row")?.hidden).toBe(true);
    expect(slotValueFor(off.document, place("brands"))).toBe("off");
  });

  test("reviews are paid for in both shapes, like the product page's", () => {
    const reviews = SLOTS.home.find((one) => one.key === "reviews")!;
    for (const option of reviews.options!.filter((one) => one.value !== "off")) {
      expect(option.premium, option.value).toBe(true);
    }
  });
});

