/**
 * The account page, wired — and three promises taken back.
 *
 * This page's places were the furthest from the truth of any in the editor.
 * "Before they are known" offered order-tracking OR signing in: both are on,
 * and neither is the theme's to decide. "What the page holds" offered editable
 * details and an address book, which the shop has never had. And nothing at all
 * mentioned the one thing this page holds that no other page does — a shopper
 * reading, changing and deleting their own reviews.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import type { ThemeDocument, ThemeEditorState, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import en from "../../messages/en.json";
import { choiceEdits, sectionOfType, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });
const choice = (id: string, options: string[], fallback: string) => ({
  id,
  type: "select",
  ...labels(id),
  options,
  default: fallback,
});

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    account: {
      ...labels("Account"),
      at_most_one: true,
      required: true,
      settings: [
        choice("greeting", ["name", "plain", "none"], "name"),
        choice("orders", ["rows", "cards"], "rows"),
        { id: "reviews", type: "boolean", ...labels("Their reviews"), default: true },
        choice("when_empty", ["text", "invite"], "text"),
      ],
    },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: { account: { ...labels("Account"), sections: ["account"], default: [] } },
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
      templates: { account: { sections } },
    } as unknown as ThemeDocument,
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const place = (key: string) => wiringFor("account", key)!;

const pick = (state: EditorState, key: string, value: string) =>
  choiceEdits(state.document, place(key), value, { page: "account", key }).reduce(
    editorReducer,
    state,
  );

const settingsOf = (state: EditorState) =>
  (sectionOfType(state.document, place("greeting"), "account")?.settings ?? {}) as Record<
    string,
    unknown
  >;

const PAGE = () => editor([section("account", "account")]);

describe("the account page is wired", () => {
  test("every place on it is real", () => {
    for (const slot of SLOTS.account) {
      if (slot.inherited) continue;
      const wiring = wiringFor("account", slot.key);
      expect(wiring, slot.key).toBeTruthy();
      expect(wiring!.page, slot.key).toBe("templates.account");
    }
  });

  test("the welcome uses their name unless a merchant says otherwise", () => {
    expect(slotValueFor(PAGE().document, place("greeting"))).toBe("name");
    for (const value of ["plain", "none"]) {
      expect(settingsOf(pick(PAGE(), "greeting", value)).greeting).toBe(value);
    }
  });

  test("orders are a list until a merchant asks for cards", () => {
    expect(slotValueFor(PAGE().document, place("orders"))).toBe("rows");
    expect(settingsOf(pick(PAGE(), "orders", "cards")).orders).toBe("cards");
  });

  test("their reviews are shown, and switching that off is a deliberate act", () => {
    expect(slotValueFor(PAGE().document, place("reviews"))).toBe("on");
    expect(settingsOf(pick(PAGE(), "reviews", "off")).reviews).toBe(false);
  });

  test("the empty answer is not called what Liquid calls nothing", () => {
    /* `empty` is a literal in Liquid; the category page met that four times. */
    expect(settingsOf(pick(PAGE(), "empty", "invite")).when_empty).toBe("invite");
    expect(settingsOf(pick(PAGE(), "empty", "invite")).empty).toBeUndefined();
  });
});

describe("the promises this page could not keep are gone", () => {
  test("it no longer offers a choice between two things that are both on", () => {
    /*
      Accounts belong to every shop (owner, 2026-09-22) and the order tracker is
      a module switch in Settings. Neither was ever the theme's to decide.
    */
    expect(SLOTS.account.find((one) => one.key === "door")).toBeUndefined();
    expect(en.themeEditor.slots).not.toHaveProperty("accountDoorSignInNote");
  });

  test("nor an address book and editable details the shop has never had", () => {
    expect(SLOTS.account.find((one) => one.key === "panels")).toBeUndefined();
    expect(en.themeEditor.slots).not.toHaveProperty("accountTabAddresses");
  });

  test("and the reviews it has held since 2026-09-22 are finally on the canvas", () => {
    const slot = SLOTS.account.find((one) => one.key === "reviews")!;
    expect(slot.initial).toBe("on");
    expect(slot.options!.map((one) => one.value)).toEqual(["on", "off"]);
  });
});

describe("the canvas draws what the shop draws", () => {
  const draw = (slotKey: string, variant: string) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ShopChrome page="account" slotKey={slotKey} variant={variant} settings={{}} />
      </NextIntlClientProvider>,
    );

  test("a review waiting for the merchant is drawn as waiting", () => {
    /*
      That state is the whole reason this band exists: a review its author
      cannot find reads as lost, and they write it again.
    */
    const html = draw("reviews", "on");
    expect(html).toContain(en.themeEditor.slots.accountReviewWaiting);
    expect(html).toContain(en.themeEditor.slots.accountReviewPublished);
  });

  test("and it says the review is theirs to change or delete", () => {
    const html = draw("reviews", "on");
    expect(html).toContain(en.themeEditor.slots.accountReviewEdit);
    expect(html).toContain(en.themeEditor.slots.accountReviewDelete);
  });

  test("off says the band is not there rather than drawing an empty one", () => {
    const html = draw("reviews", "off");
    expect(html).toContain(en.themeEditor.slots.accountReviewsOffExample);
    expect(html).not.toContain(en.themeEditor.slots.accountReviewWaiting);
  });
});

describe("the welcome is a card, as the shop draws it", () => {
  /*
    Made personal the way a Shopify customer account is (owner, 2026-09-25):
    a DiceBear face, how the shop reaches them, how long they have been a
    member, what they have here, and their newest order.
  */
  const slots = en.themeEditor.slots;
  const shop = {
    name: "Gadzilla",
    address: "",
    phone: "",
    email: "",
    social: [],
    wishlist: true,
    orderLookup: true,
  };
  const draw = (variant: string, settings: Record<string, string> = {}, over: Partial<typeof shop> = {}) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ShopChrome
          page="account"
          slotKey="greeting"
          variant={variant}
          settings={settings}
          shop={{ ...shop, ...over }}
        />
      </NextIntlClientProvider>,
    );

  test("with a DiceBear thumbs face, the style the dashboard's own people have", () => {
    expect(draw("name")).toContain("https://api.dicebear.com/9.x/thumbs/svg?seed=");
  });

  test("the greeting is the merchant's choice and the plain word is the shop's own", () => {
    expect(draw("name")).toContain(slots.accountGreetingExample);
    expect(draw("plain")).toContain("Your account");
    expect(slots.accountTitleExample).toBe("Your account");
  });

  test("it says how to reach them, since when, and what they have here", () => {
    const html = draw("name");
    expect(html).toContain(slots.accountContactExample);
    expect(html).toContain(slots.accountMemberSinceExample);
    for (const label of [slots.accountCountOrders, slots.accountCountReviews, slots.accountCountSaved]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(slots.accountLatestOrder);
  });

  test("a count whose page does not exist is not drawn, as on the shop", () => {
    expect(draw("name", { reviews: "off" })).not.toContain(`>${slots.accountCountReviews}<`);
    expect(draw("name", {}, { wishlist: false })).not.toContain(`>${slots.accountCountSaved}<`);
  });

  test("the place says what the card holds, and nothing leaves the whole card out", () => {
    const greeting = SLOTS.account.find((slot) => slot.key === "greeting")!;
    expect(greeting.hint).toBe("accountGreetingHint");
    expect(slots.accountGreetingEmpty).toBe("No welcome card");
  });
});
