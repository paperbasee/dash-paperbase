/**
 * A small theme shaped like Basic (engine/apps/theming/themes/basic.json), plus two made-up
 * sections: "notice" is required but may repeat, and "slides" takes settings and blocks.
 */

import type { ThemeDocument, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

export const manifest: ThemeManifest = {
  key: "basic",
  name: "Basic",
  name_bn: "বেসিক",
  category: null,
  settings: [],
  sections: {
    announcement_bar: {
      ...labels("Announcement bar"),
      settings: [
        { id: "text", type: "text", ...labels("Message"), default: "" },
        { id: "link", type: "url", ...labels("Link"), default: "" },
      ],
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
    banner_slider: { ...labels("Banners"), settings: [] },
    rich_text: {
      ...labels("Text"),
      settings: [{ id: "align", type: "select", ...labels("Alignment"), default: "center" }],
    },
    // A section the theme sells rather than gives away, like `promo` in the real one.
    promo: { ...labels("Promotion"), premium: true, settings: [] },
    product_gallery: { ...labels("Product images"), at_most_one: true, settings: [] },
    product_details: {
      ...labels("Product details"),
      at_most_one: true,
      required: true,
      required_blocks: ["title", "buy_buttons"],
      settings: [],
      blocks: {
        title: { ...labels("Title"), settings: [] },
        buy_buttons: { ...labels("Buy buttons"), settings: [] },
        custom_text: {
          ...labels("Custom text"),
          settings: [{ id: "text", type: "textarea", ...labels("Text"), default: "" }],
        },
      },
    },
    notice: { ...labels("Notice"), required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["announcement_bar", "header"] },
    footer: { ...labels("Footer"), sections: ["footer"] },
  },
  templates: {
    home: { ...labels("Home"), sections: ["banner_slider", "rich_text", "promo"] },
    product: {
      ...labels("Product"),
      sections: ["product_gallery", "product_details", "rich_text"],
    },
    notices: { ...labels("Notices"), sections: ["notice", "rich_text"] },
  },
};

export const section = (id: string, type: string, over: Partial<ThemeSection> = {}): ThemeSection => ({
  id,
  type,
  hidden: false,
  settings: {},
  blocks: [],
  ...over,
});

export function document(): ThemeDocument {
  return {
    theme: "basic",
    settings: {},
    header: {
      sections: [
        section("announcement-bar", "announcement_bar", { hidden: true, settings: { text: "", link: "" } }),
        section("header", "header"),
      ],
    },
    footer: { sections: [section("footer", "footer")] },
    templates: {
      home: { sections: [section("banner-slider", "banner_slider")] },
      product: {
        sections: [
          section("product-gallery", "product_gallery"),
          section("product-details", "product_details", {
            blocks: [
              { id: "title", type: "title", settings: {} },
              { id: "buy-buttons", type: "buy_buttons", settings: {} },
            ],
          }),
        ],
      },
      notices: { sections: [section("notice", "notice")] },
    },
  };
}
