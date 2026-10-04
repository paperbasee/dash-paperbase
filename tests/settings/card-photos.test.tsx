/**
 * Card photos (owner, 2026-10-04): the categories whose cards take each photo's own shape,
 * ticked on the Category page of the editor and kept in the theme's `card_photos` setting.
 *
 * A category not named takes its parent's answer, as the shop reads it (shop-paperbase
 * `storefront/card_photos.py`), and a tick writes the smallest map that says it.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeEditorState, ThemeManifest } from "@/lib/theme-editor/api";
import { followingNames, follows, parentsOf, ticksIn, toggled } from "@/lib/theme-editor/card-photos";
import { editorReducer, initEditorState } from "@/lib/theme-editor/editor-reducer";
import { fieldSpecs } from "@/lib/theme-editor/field-specs";
import { MAX_CATEGORY_TICKS } from "@/lib/theme-editor/rules";
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
type Node = { public_id: string; name: string; children: Node[] };
const node = (public_id: string, name: string, children: Node[] = []): Node => ({ public_id, name, children });
const TREE = [node(WOMEN, "Women", [node(DRESSES, "Dresses"), node(TOPS, "Tops")]), node(MEN, "Men")];
const parents = parentsOf(TREE);

describe("which categories follow", () => {
  test("nothing ticked is none", () => {
    expect(follows({}, WOMEN, parents)).toBe(false);
    expect(ticksIn(undefined)).toEqual({});
    expect(ticksIn({ card_photos: [WOMEN] })).toEqual({});
  });

  test("a ticked category covers the ones under it, and one can be kept out", () => {
    expect(follows({ [WOMEN]: true }, DRESSES, parents)).toBe(true);
    expect(follows({ [WOMEN]: true }, MEN, parents)).toBe(false);
    expect(follows({ [WOMEN]: true, [DRESSES]: false }, DRESSES, parents)).toBe(false);
    expect(follows({ [WOMEN]: true, [DRESSES]: false }, TOPS, parents)).toBe(true);
  });
});

describe("a tick writes the smallest map that says it", () => {
  test("ticking a department, then keeping one out, then unticking it all", () => {
    const one = toggled({}, TREE, WOMEN);
    expect(one).toEqual({ [WOMEN]: true });
    const two = toggled(one, TREE, DRESSES);
    expect(two).toEqual({ [WOMEN]: true, [DRESSES]: false });
    expect(toggled(two, TREE, WOMEN)).toEqual({});
  });

  test("a sub-category on its own, then its department over it", () => {
    const one = toggled({}, TREE, DRESSES);
    expect(one).toEqual({ [DRESSES]: true });
    expect(toggled(one, TREE, WOMEN)).toEqual({ [WOMEN]: true });
  });

  test("ticking one back in a ticked department removes its entry", () => {
    expect(toggled({ [WOMEN]: true, [DRESSES]: false }, TREE, DRESSES)).toEqual({ [WOMEN]: true });
  });

  test("a category gone from the shop is dropped", () => {
    expect(toggled({ [id(99)]: true }, TREE, MEN)).toEqual({ [MEN]: true });
  });
});

describe("what the list of places says", () => {
  test("the categories that start a run, by name", () => {
    expect(followingNames({}, TREE)).toEqual([]);
    expect(followingNames({ [WOMEN]: true, [DRESSES]: false }, TREE)).toEqual(["Women"]);
    expect(followingNames({ [DRESSES]: true, [MEN]: true }, TREE)).toEqual(["Dresses", "Men"]);
  });
});

describe("the setting", () => {
  const spec = {
    id: "card_photos",
    type: "category_ticks",
    label: "Cards that follow the photo",
    label_bn: "ছবির মাপে কার্ড",
    default: {},
  };
  const [field] = fieldSpecs([spec] as never, "en");

  test("takes the shape the API takes, and nothing else", () => {
    expect(checkField(field, {})).toBeNull();
    expect(checkField(field, { [WOMEN]: true, [DRESSES]: false })).toBeNull();
    expect(checkField(field, [WOMEN])).not.toBeNull();
    expect(checkField(field, { women: true })).not.toBeNull();
    expect(checkField(field, { [WOMEN]: "yes" })).not.toBeNull();
    const many = Object.fromEntries(Array.from({ length: MAX_CATEGORY_TICKS + 1 }, (_, n) => [id(n), true]));
    expect(checkField(field, many)).not.toBeNull();
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
    const next = editorReducer(state, { type: "setThemeSetting", setting: "card_photos", value: { [WOMEN]: true } });
    expect(next.document.settings?.card_photos).toEqual({ [WOMEN]: true });
    const refused = editorReducer(state, { type: "setThemeSetting", setting: "card_photos", value: [WOMEN] });
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
      "catPhotosUnfold",
      "catPhotosFold",
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

  const draw = (ticks: Record<string, boolean>, tree: never) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <CardPhotosPanel tree={tree} failed={false} ticks={ticks} onToggle={() => {}} onClose={() => {}} />
      </NextIntlClientProvider>,
    );

  test("lists every category, the ones under each beneath it, ticked as the shop reads them", () => {
    const html = draw({ [WOMEN]: true, [DRESSES]: false }, TREE as never);
    for (const name of ["Women", "Dresses", "Tops", "Men"]) expect(html).toContain(name);
    expect(html).toContain("Dresses, Tops");
    const checked = [...html.matchAll(/<input type="checkbox"([^>]*)>/g)].map((m) => m[1].includes("checked"));
    // Women, Dresses, Tops, Men -- in the order drawn.
    expect(checked).toEqual([true, false, true, false]);
  });

  test("a department is folded until the merchant ticks something inside it", () => {
    const folded = draw({ [WOMEN]: true }, TREE as never);
    expect(folded.match(/type="checkbox"/g)).toHaveLength(2);
    expect(folded).toContain('aria-expanded="false"');
    expect(folded).toContain(`aria-label="Show the categories in Women"`);
    // Its sub-categories are still named under it, so a merchant knows what the tick covers.
    expect(folded).toContain("Dresses, Tops");
    expect(draw({ [DRESSES]: true }, TREE as never).match(/type="checkbox"/g)).toHaveLength(4);
  });

  test("says so while the categories load, and when the shop has none", () => {
    expect(draw({}, undefined as never)).toContain(en.themeEditor.slots.catPhotosLoading);
    expect(draw({}, [] as never)).toContain(en.themeEditor.slots.catPhotosNoCategories);
  });
});
