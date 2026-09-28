/**
 * The sample shop drawn beside setup (owner, 2026-09-28).
 *
 * A new owner has no products yet, so setup shows their name, their address and their colours
 * on the home page of a shop of the kind they picked, every section on: six kinds, each with a
 * photo across the top, eight products and two pictures of its own. The words are in `messages`
 * (`shopPreview`, and `shopPreview.kinds.<kind>` for the kind's own); the photos are free
 * Unsplash photos resized for this, in `public/onboarding/` (credits in PHOTO_CREDITS.md). They
 * are only ever drawn here -- the shop itself starts empty.
 */

import type { LucideIcon } from "lucide-react";
import { Armchair, Gift, Headphones, Shirt, Soup, Sparkles } from "lucide-react";

export const SHOP_KINDS = ["clothing", "beauty", "electronics", "food", "home", "other"] as const;

export type ShopKind = (typeof SHOP_KINDS)[number];

/** Each kind's picture on setup's cards (owner, 2026-09-28: a logo for each, not letters). */
export const KIND_ICONS: Record<ShopKind, LucideIcon> = {
  clothing: Shirt,
  beauty: Sparkles,
  electronics: Headphones,
  food: Soup,
  home: Armchair,
  other: Gift,
};

/**
 * What setup saves as the shop's type: the kind's English name, which is what Settings > Store
 * info shows and edits (free text, up to four words).
 */
export const STORE_TYPE_BY_KIND: Record<ShopKind, string> = {
  clothing: "Clothing",
  beauty: "Beauty",
  electronics: "Electronics",
  food: "Food",
  home: "Home",
  other: "Other",
};

/** The kind a saved store type names, when it names one -- setup picks up where it stopped. */
export function kindFromStoreType(storeType: string | null | undefined): ShopKind | null {
  const typed = (storeType ?? "").trim().toLowerCase();
  return SHOP_KINDS.find((kind) => STORE_TYPE_BY_KIND[kind].toLowerCase() === typed) ?? null;
}

/** The palette the Look step starts on for each kind; the owner picks any of the six. */
export const SUGGESTED_PALETTE: Record<ShopKind, string> = {
  clothing: "porcelain",
  beauty: "rose",
  electronics: "navy",
  food: "clay",
  home: "sage",
  other: "emerald",
};

/** A product of the sample shop: 1 to 8. */
export type SampleProduct = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Each kind's eight products' prices, in taka. */
export const SAMPLE_PRICES: Record<ShopKind, readonly number[]> = {
  clothing: [1850, 2400, 3200, 4500, 2950, 1650, 1450, 690],
  beauty: [1290, 1650, 850, 2200, 450, 1350, 390, 290],
  electronics: [2490, 3800, 4200, 650, 5200, 1150, 390, 6800],
  food: [650, 380, 280, 1100, 950, 320, 450, 1200],
  home: [1200, 950, 1700, 850, 1100, 1450, 2100, 750],
  other: [590, 1200, 890, 250, 780, 650, 450, 150],
};

/** The products on sale, as a shop's usually are: a few, each shown beside its old price. */
const ON_SALE: ReadonlySet<SampleProduct> = new Set([2, 5]);

export function samplePrice(kind: ShopKind, n: SampleProduct): { price: number; was: number | null } {
  const price = SAMPLE_PRICES[kind][n - 1];
  return { price, was: ON_SALE.has(n) ? Math.round((price * 1.25) / 10) * 10 : null };
}

/**
 * The brands row's names: plain words, as a small shop's own labels are -- never a real brand's
 * name. Brand names are not translated.
 */
export const SAMPLE_BRANDS = ["Classic", "Studio", "Everyday", "Heritage", "Craft"] as const;

export function heroPhoto(kind: ShopKind): string {
  return `/onboarding/${kind}-hero.webp`;
}

export function productPhoto(kind: ShopKind, n: SampleProduct): string {
  return `/onboarding/${kind}-${n}.webp`;
}

/** The kind's two pictures of its own, for the home page's picture rows, video and blog. */
export function scenePhoto(kind: ShopKind, n: 1 | 2): string {
  return `/onboarding/${kind}-scene-${n}.webp`;
}

/** A price as the shop shows it: taka, in the reader's digits. */
export function formatTaka(amount: number, locale: string): string {
  return `৳${new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-IN").format(amount)}`;
}
