/**
 * What a merchant may set their shop in: the palettes, and the faces.
 *
 * **Design data, like `slot-catalogue.ts`.** The palettes are the ones the API
 * already ships in `engine/apps/theming/presets.py`, plus the two the owner was
 * shown on 2026-09-19 and did not choose -- real options, not invented ones, so
 * the panel can be judged at the size it will really be.
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

export type Palette = {
  key: string;
  /** `themeEditor.slots.*` key. */
  label: string;
  /** Shown as swatches, in the order a shop meets them. */
  background: string;
  foreground: string;
  accent: string;
  muted: string;
  border: string;
  /** In the API's presets today. The rest are drawn for the panel. */
  shipped?: boolean;
};

export const PALETTES: Palette[] = [
  {
    key: "ivory",
    label: "paletteIvory",
    background: "#FAFAF8",
    foreground: "#1A1A1A",
    accent: "#C9A96E",
    muted: "#F0EFEA",
    border: "#E5E4DF",
    shipped: true,
  },
  {
    key: "verdigris",
    label: "paletteVerdigris",
    background: "#EEE7DA",
    foreground: "#1F1A15",
    accent: "#2E5E58",
    muted: "#F7F2E8",
    border: "#D5C9B4",
    shipped: true,
  },
  {
    key: "garnet",
    label: "paletteGarnet",
    background: "#F3EDE6",
    foreground: "#241C19",
    accent: "#7A2E2B",
    muted: "#EAE0D6",
    border: "#D9CCC0",
  },
  {
    key: "indigo",
    label: "paletteIndigo",
    background: "#F4F2EC",
    foreground: "#1C2030",
    accent: "#2F3A5C",
    muted: "#E8E5DC",
    border: "#CFCBBF",
  },
];

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

export const CORNERS: Corner[] = [
  { key: "square", label: "cornerSquare", radius: 0 },
  { key: "soft", label: "cornerSoft", radius: 6 },
  { key: "round", label: "cornerRound", radius: 14 },
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
