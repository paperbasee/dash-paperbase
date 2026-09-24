/**
 * The rest of the home page, wired (2026-09-24).
 *
 * Brands, customer reviews, the newest posts, the WhatsApp sign-up and the
 * questions. A "Video" place is gone: it was the `video` section the hero's
 * Video choice already owns. The sign-up lost its Email choice with the email
 * newsletter. And the drawing is the shop's own -- "Nusrat J.", six grey logos
 * and three invented posts were nobody's shop.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
import {
  ShopChrome,
  type BlogPreview,
  type BrandPreview,
  type PostPreview,
  type ReviewPreview,
  type ShopIdentity,
} from "@/components/theme-editor/slots/ShopChrome";
import en from "../../messages/en.json";

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
      ...labels("WhatsApp"),
      settings: [
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
      if (slot.inherited) continue;
      expect(wiringFor("home", slot.key), slot.key).toBeTruthy();
    }
  });

  test("the video place is gone: the hero owns the video section", () => {
    expect(SLOTS.home.map((one) => one.key)).not.toContain("video");
    expect(wiringFor("home", "hero")!.sections.video).toBe("video");
  });

  test("the sign-up is WhatsApp or nothing", () => {
    const signup = SLOTS.home.find((one) => one.key === "signup")!;
    expect(signup.options!.map((one) => one.value)).toEqual(["whatsapp", "off"]);
  });

  test("a page without them reads as off", () => {
    for (const key of PLACES) expect(slotValueFor(editor().document, place(key)), key).toBe("off");
  });

  test("each one adds its own section, in the canvas's order", () => {
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

const BRANDS: BrandPreview[] = [
  { name: "Active", logo: false },
  { name: "Footwear", logo: true },
];
const REVIEWS: ReviewPreview[] = [
  { name: "Nadia", rating: 5, body: "Arrived the next day, exactly as shown.", product: "Anker Soundcore Q20", byShop: false },
  { name: "Karim", rating: 4, body: "Good sound for the price.", product: "Baseus Bowie", byShop: false },
  { name: "Gadzilla", rating: 5, body: "Our best seller this month.", product: "Anker Q20", byShop: true },
];
const post = (title: string): PostPreview => ({
  title,
  excerpt: `${title}, in a line.`,
  tag: "Style guide",
  date: "Sep 15, 2026",
  reads: 3,
  featured: false,
  tags: ["Style guide"],
  pictured: true,
  author: "",
  words: [],
});
const BLOG: BlogPreview = { posts: ["One", "Two", "Three", "Four"].map(post), tags: ["Style guide"] };
const SHOP: ShopIdentity = {
  name: "Gadzilla",
  address: "",
  phone: "",
  email: "",
  social: ["whatsapp"],
  wishlist: false,
  orderLookup: false,
};

function draw(
  slotKey: string,
  variant: string,
  over: { live?: ThemeSection; brands?: BrandPreview[]; reviews?: ReviewPreview[]; blog?: BlogPreview; shop?: ShopIdentity } = {},
) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome
        page="home"
        slotKey={slotKey}
        variant={variant}
        settings={{}}
        live={over.live}
        brands={over.brands ?? BRANDS}
        reviews={over.reviews ?? REVIEWS}
        blog={over.blog ?? BLOG}
        shop={over.shop ?? SHOP}
      />
    </NextIntlClientProvider>,
  );
}

describe("the canvas draws this shop's own", () => {
  test("nobody else's reviewers, posts or questions", () => {
    const guilty: string[] = [];
    for (const key of PLACES) {
      const slot = SLOTS.home.find((one) => one.key === key)!;
      for (const option of slot.options ?? []) {
        const html = draw(key, option.value);
        for (const word of ["Nusrat", "Rafiq", "Tanvir", "How long does delivery take", "Order on WhatsApp", "journal"]) {
          if (html.includes(word)) guilty.push(`${key}=${option.value} says "${word}"`);
        }
      }
    }
    expect(guilty).toEqual([]);
  });

  test("its brands, by name", () => {
    const html = draw("brands", "row");
    expect(html).toContain("Active");
    expect(html).toContain("Footwear");
    expect(html).toContain("All brands");
  });

  test("its reviews, each with its product, and the shop's own marked", () => {
    const cards = draw("reviews", "cards");
    expect(cards).toContain("Arrived the next day");
    expect(cards).toContain("Anker Soundcore Q20");
    expect(cards).toContain("Gadzilla · From the shop");
    const quote = draw("reviews", "quote");
    expect(quote).toContain("Arrived the next day");
    expect(quote).not.toContain("Good sound for the price");
  });

  test("its three newest posts", () => {
    const html = draw("posts", "three");
    expect(html).toContain("One");
    expect(html).toContain("Three");
    expect(html).not.toContain(">Four<");
  });

  test("its WhatsApp band says what the shop says, and nothing without a number", () => {
    expect(draw("signup", "whatsapp")).toContain("Message us on WhatsApp");
    const written = draw("signup", "whatsapp", { live: section("wa", "whatsapp", { settings: { button_label: "Chat with us" } }) });
    expect(written).toContain("Chat with us");
    const none = draw("signup", "whatsapp", { shop: { ...SHOP, social: [] } });
    expect(none).toContain("Add a WhatsApp number in Settings");
  });

  test("its own questions, as the pop-up writes them", () => {
    const live = section("faq", "faq", {
      blocks: [
        { id: "q1", type: "question", settings: { question: "Do you deliver to Barishal?", answer: "Yes." } },
      ],
    } as Partial<ThemeSection>);
    expect(draw("faq", "on", { live })).toContain("Do you deliver to Barishal?");
  });

  test("a line saying so where the shop would show nothing", () => {
    expect(draw("brands", "row", { brands: [] })).toContain("nothing shows on your shop");
    expect(draw("reviews", "cards", { reviews: [] })).toContain("nothing shows on your shop");
    expect(draw("posts", "three", { blog: { posts: [], tags: [] } })).toContain("nothing shows on your shop");
    expect(draw("faq", "on")).toContain("Nothing shows on your shop until you write one");
  });
});
