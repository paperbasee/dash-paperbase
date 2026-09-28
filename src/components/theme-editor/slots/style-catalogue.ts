/**
 * What a merchant may set their shop in: the faces, the corners and the card
 * styles.
 *
 * **Not the palettes.** Their colours are the API's (`theming/presets.py`,
 * served at `theming/presets/`) since the six replaced these drawings on
 * 2026-09-25 -- see `lib/theme-editor/palettes.ts` -- so no colour is written
 * down twice.
 *
 * **The face carries the language.** The owner decided on 2026-09-20 that a shop
 * does not choose a language and then a font: it chooses a font, and the
 * language follows. One decision instead of three -- a language, a Latin face
 * and a Bangla face -- and the combination that used to be possible and wrong,
 * an English shop set in a face with no Latin in it, simply does not exist.
 *
 * Every shop still needs BOTH faces: an English shop has Bangla product names,
 * and a Bangla shop has Latin brands and sizes. So a face names its `pairedWith`
 * and we supply the other half. That is the part a merchant does not choose, and
 * the only real cost of folding three controls into one.
 *
 * **The faces themselves are loaded in `StylePanel`, not here.** `next/font` is a
 * build-time transform that only runs on component modules; called from a plain
 * data file it survives to the checker as an ordinary function call and the
 * build stops with "Font loader calls must be assigned to a const" -- which it
 * is, and which is not the actual problem. So this file stays pure data and the
 * panel maps each key to the class the loader made.
 */

export type ShopLanguage = "en" | "bn";

export type Face = {
  key: string;
  /** The family's own name, which is not translated. */
  name: string;
  /** Picking this face sets the shop to this language. */
  language: ShopLanguage;
  /** `themeEditor.slots.*` key: what the face is like, in a few words. */
  note: string;
  /** The other half we supply, because every shop needs both scripts. */
  pairedWith: string;
  /** A line in the face's own script, so a merchant sees it before choosing. */
  specimen: string;
};

export const FACES: Face[] = [
  {
    key: "poppins",
    name: "Poppins",
    language: "en",
    note: "facePoppins",
    pairedWith: "Noto Sans Bengali",
    specimen: "Denim Work Shirt",
  },
  {
    key: "archivo",
    name: "Archivo",
    language: "en",
    note: "faceArchivo",
    pairedWith: "Noto Sans Bengali",
    specimen: "Denim Work Shirt",
  },
  {
    key: "playfair",
    name: "Playfair Display",
    language: "en",
    note: "facePlayfair",
    pairedWith: "Noto Sans Bengali",
    specimen: "Denim Work Shirt",
  },
  {
    key: "cinzel",
    name: "Cinzel",
    language: "en",
    note: "faceCinzel",
    pairedWith: "Noto Sans Bengali",
    specimen: "GADZILLA",
  },
  {
    key: "noto-bengali",
    name: "Noto Sans Bengali",
    language: "bn",
    note: "faceNotoBengali",
    pairedWith: "Poppins",
    specimen: "ডেনিম ওয়ার্ক শার্ট",
  },
];

/**
 * Corners.
 *
 * One value dresses everything a shop draws a box around -- cards, buttons,
 * inputs, panels, the picture frames -- so it is one choice rather than a
 * setting per component. `radius` is the largest step; the smaller ones scale
 * from it, which is how `styles/base.css` already resolves `rounded-sm` and
 * `rounded-md` against `rounded-lg`.
 */
export type Corner = {
  key: string;
  /** `themeEditor.slots.*` key. */
  label: string;
  /** What the preview draws, and what the shop would resolve `rounded-lg` to. */
  radius: number;
};

/*
  The keys are the THEME's values (`corner_style` in the manifest), not this
  file's own names: a merchant's click writes one of them into the document, and
  a key the theme does not offer is a click that changes nothing and says
  nothing. `round` was one such until 2026-09-23, when this became real.

  `radius` is for the drawing on the tile only. It matches the large radius the
  shop actually draws for that choice -- 0, 6, 14 -- so the tile is a preview
  rather than an illustration.
*/
export const CORNERS: Corner[] = [
  { key: "square", label: "cornerSquare", radius: 0 },
  { key: "soft", label: "cornerSoft", radius: 6 },
  { key: "rounded", label: "cornerRound", radius: 14 },
];

/**
 * How hard a product card sells.
 *
 * The two the API already ships (`theming/presets.py` CARD_VARIANTS). It is a
 * decision about selling rather than about looks -- which is why it survives as
 * a merchant setting and is not folded into the palette.
 */
export type CardStyle = {
  key: string;
  /** `themeEditor.slots.*` key. */
  label: string;
  /** `themeEditor.slots.*` key: what it does differently, in a few words. */
  note: string;
};

export const CARD_STYLES: CardStyle[] = [
  { key: "classic", label: "cardClassic", note: "cardClassicNote" },
  { key: "shelf", label: "cardShelf", note: "cardShelfNote" },
];

/**
 * Where a product card's words sit (owner, 2026-09-29): the name, the price and the old price on
 * the left, in the middle or on the right -- chosen once, for every card in the shop. The keys are
 * the theme's `card_align` values; centred is its default and what every card has drawn.
 */
export type CardAlign = {
  key: "left" | "center" | "right";
  /** `themeEditor.slots.*` key. */
  label: string;
};

export const CARD_ALIGNS: CardAlign[] = [
  { key: "left", label: "cardAlignLeft" },
  { key: "center", label: "cardAlignCenter" },
  { key: "right", label: "cardAlignRight" },
];
