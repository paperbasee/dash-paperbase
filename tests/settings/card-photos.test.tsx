/**
 * Card photos (owner, 2026-10-04): the main categories whose cards take each photo's own
 * shape, ticked on the Category page of the editor and kept in the theme's `card_photos`
 * setting -- main categories only, each covering what is filed under it, as the shop reads it
 * (shop-paperbase `storefront/card_photos.py`).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest } from "@/lib/theme-editor/api";
import { followingNames, pickedIn, toggled, type CategoryNode } from "@/lib/theme-editor/card-photos";
import { editorReducer, initEditorState } from "@/lib/theme-editor/editor-reducer";
import { fieldSpecs } from "@/lib/theme-editor/field-specs";
import { MAX_CATEGORIES } from "@/lib/theme-editor/rules";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { checkField } from "@/lib/theme-editor/validate";
import { CardPhotosPanel } from "@/components/theme-editor/slots/CardPhotosPanel";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const id = (n: number) => `cat_${n.toString(16).padStart(20, "0")}`;
const WOMEN = id(1);
const DRESSES = id(2);
const TOPS = id(3);
const MEN = id(4);
const node = (public_id: string, name: string, children: CategoryNode[] = []): CategoryNode => ({ public_id, name, children });
const TREE = [node(WOMEN, "Women", [node(DRESSES, "Dresses"), node(TOPS, "Tops")]), node(MEN, "Men")];

describe("what is ticked", () => {
  test("nothing, until a main category is", () => {
    expect(pickedIn(undefined)).toEqual([]);
    expect(pickedIn({ card_photos: { [WOMEN]: true } })).toEqual([]);
    expect(pickedIn({ card_photos: [WOMEN, 3] })).toEqual([WOMEN]);
  });

  test("ticking and unticking, kept in the shop's order", () => {
    const one = toggled([], TREE, MEN);
    expect(one).toEqual([MEN]);
    const two = toggled(one, TREE, WOMEN);
    expect(two).toEqual([WOMEN, MEN]);
    expect(toggled(two, TREE, MEN)).toEqual([WOMEN]);
  });

  test("only main categories: a sub-category, or one gone from the shop, is dropped", () => {
    expect(toggled([DRESSES, id(99)], TREE, MEN)).toEqual([MEN]);
    expect(toggled([], TREE, DRESSES)).toEqual([]);
  });

  test("the list of places names the ticked ones", () => {
    expect(followingNames([], TREE)).toEqual([]);
    expect(followingNames([MEN, WOMEN], TREE)).toEqual(["Women", "Men"]);
  });
});

describe("the setting", () => {
  const spec = {
    id: "card_photos",
    type: "categories",
    label: "Cards that follow the photo",
    label_bn: "ছবির মাপে কার্ড",
    default: [],
  };
  const [field] = fieldSpecs([spec] as never, "en");

  test("takes the shape the API takes, and nothing else", () => {
    expect(checkField(field, [])).toBeNull();
    expect(checkField(field, [WOMEN, MEN])).toBeNull();
    expect(checkField(field, { [WOMEN]: true })).not.toBeNull();
    expect(checkField(field, ["women"])).not.toBeNull();
    expect(checkField(field, [WOMEN, WOMEN])).not.toBeNull();
    expect(checkField(field, Array.from({ length: MAX_CATEGORIES + 1 }, (_, n) => id(n)))).not.toBeNull();
  });

  test("is a draft like the card style: written by setThemeSetting", () => {
    const manifest = {
      key: "storefront",
      settings: [spec],
      sections: {},
      groups: {},
      templates: { home: { label: "Home", label_bn: "হোম", sections: [], default: [] } },
    } as unknown as ThemeManifest;
    const state = initEditorState({
      document: { theme: "storefront", settings: {}, templates: { home: { sections: [] } } } as unknown as ThemeDocument,
      manifest,
      draft_revision: 1,
      has_draft: false,
    } as unknown as ThemeEditorState);
    const next = editorReducer(state, { type: "setThemeSetting", setting: "card_photos", value: [WOMEN] });
    expect(next.document.settings?.card_photos).toEqual([WOMEN]);
    const refused = editorReducer(state, { type: "setThemeSetting", setting: "card_photos", value: { [WOMEN]: true } });
    expect(refused).toBe(state);
  });
});

describe("the place", () => {
  test("is on the Category page, after How many across", () => {
    const keys = SLOTS.category.map((slot) => slot.key);
    expect(keys.indexOf("photos")).toBe(keys.indexOf("grid") + 1);
    expect(SLOTS.category.find((slot) => slot.key === "photos")?.themeSetting).toBe("card_photos");
  });

  test("its words are written in both languages", () => {
    for (const key of [
      "catPhotos",
      "catPhotosHint",
      "catPhotosList",
      "catPhotosNote",
      "catPhotosSquare",
      "catPhotosMore",
      "catPhotosLoading",
      "catPhotosNoCategories",
      "catPhotosFailed",
    ] as const) {
      expect(en.themeEditor.slots[key], key).toBeTruthy();
      expect(bn.themeEditor.slots[key], key).toMatch(/[ঀ-৿]/);
    }
  });

  const draw = (picked: string[], tree: never) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <CardPhotosPanel tree={tree} failed={false} picked={picked} onToggle={() => {}} onClose={() => {}} />
      </NextIntlClientProvider>,
    );

  test("lists the main categories only, each naming what its tick covers", () => {
    const html = draw([WOMEN], TREE as never);
    const boxes = [...html.matchAll(/<input type="checkbox"([^>]*)>/g)].map((m) => m[1].includes("checked"));
    // Women, Men -- no row of their own for Dresses or Tops.
    expect(boxes).toEqual([true, false]);
    expect(html).toContain("Dresses, Tops");
    expect(html).not.toContain("aria-expanded");
  });

  test("says so while the categories load, and when the shop has none", () => {
    expect(draw([], undefined as never)).toContain(en.themeEditor.slots.catPhotosLoading);
    expect(draw([], [] as never)).toContain(en.themeEditor.slots.catPhotosNoCategories);
  });
});
