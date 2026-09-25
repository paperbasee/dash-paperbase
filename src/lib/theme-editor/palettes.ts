/**
 * The shop's palettes, as the theme editor's Style panel offers them.
 *
 * **The colours are the API's** (`engine/apps/theming/presets.py`, served at
 * `theming/presets/`), not written down here: six palettes chosen by the owner
 * on 2026-09-25, each with its name in both languages. A shop's choice is its
 * document's `palette` setting -- a draft in the editor until Save to store,
 * like the corners and the card style -- and one it has never made is
 * Porcelain.
 *
 * **The sketch repaints in the chosen palette.** The editor has no live shop
 * beside it: the canvas is a drawing in the dashboard's own colour variables.
 * So the canvas frame re-points those variables at the palette's colours --
 * page, ink, frames, lines -- and three of the shop's own: its brand colour
 * (the big buttons and the notice strip) and its header. The editor's
 * selection marks keep the dashboard's colours; only the drawing changes.
 */

import type { ThemeDocument, ThemeHttp } from "./api";

export const DEFAULT_PALETTE = "porcelain";

/** The nineteen roles, keyed as the API names them (`primary_foreground`). */
export type PaletteTokens = Record<string, string>;

export type ShopPalette = {
  key: string;
  name: string;
  name_bn: string;
  tokens: PaletteTokens;
};

export async function fetchPalettes(http: Pick<ThemeHttp, "get">): Promise<ShopPalette[]> {
  const { data } = await http.get<{ presets: ShopPalette[] }>("theming/presets/");
  return data.presets;
}

/** The palette a document is drawn in: its own choice, or the default. */
export function chosenPalette(document: Pick<ThemeDocument, "settings"> | null | undefined): string {
  const value = document?.settings?.palette;
  return typeof value === "string" && value ? value : DEFAULT_PALETTE;
}

export function paletteName(palette: ShopPalette, locale: string): string {
  return locale === "bn" && palette.name_bn ? palette.name_bn : palette.name;
}

/** `#1F2B48` as the dashboard writes a colour variable: `222 40% 20.2%`. */
export function hexToHslTriplet(hex: string): string {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  let hue = 0;
  let sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  return `${round(hue)} ${round(sat * 100)}% ${round(light * 100)}%`;
}

/** The canvas frame's variables for one palette. */
export function canvasColours(tokens: PaletteTokens): Record<string, string> {
  const pairs: [string, string][] = [
    ["--background", "background"],
    ["--foreground", "foreground"],
    ["--muted", "muted"],
    ["--muted-foreground", "muted_foreground"],
    ["--border", "border"],
    ["--border-subtle", "border"],
    ["--card", "card"],
    ["--card-foreground", "card_foreground"],
    ["--shop-brand", "primary"],
    ["--shop-brand-foreground", "primary_foreground"],
    ["--shop-header", "header"],
    ["--shop-header-foreground", "header_foreground"],
  ];
  const out: Record<string, string> = {};
  for (const [variable, role] of pairs) {
    const hex = tokens[role];
    if (typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex)) out[variable] = hexToHslTriplet(hex);
  }
  return out;
}
