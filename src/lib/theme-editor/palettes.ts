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
 * **The preview shows it.** The editor's page is the shop itself drawing the
 * draft (2026-09-26), so a palette picked here is the shop in those colours the
 * moment the draft saves -- nothing in the dashboard repaints to imitate it.
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
