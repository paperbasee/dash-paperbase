/**
 * The sample shop drawn beside sign in, sign up and setup (owner, 2026-09-28).
 *
 * A new owner has no products yet, so setup shows their name, their address and their colours
 * on a shop of the kind they picked: six kinds, each with a photo across the top and three
 * products. The words are in `messages` (`shopPreview.kinds.<kind>`); the photos are free
 * Unsplash photos resized for this, in `public/onboarding/` (credits in PHOTO_CREDITS.md). They
 * are only ever drawn here -- the shop itself starts empty.
 */

export const SHOP_KINDS = ["clothing", "beauty", "electronics", "food", "home", "other"] as const;

export type ShopKind = (typeof SHOP_KINDS)[number];

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

/** Each kind's three products' prices, in taka. */
export const SAMPLE_PRICES: Record<ShopKind, readonly [number, number, number]> = {
  clothing: [1850, 2400, 3200],
  beauty: [1290, 1650, 850],
  electronics: [2490, 3800, 4200],
  food: [650, 380, 280],
  home: [1200, 950, 1700],
  other: [590, 1200, 890],
};

export function heroPhoto(kind: ShopKind): string {
  return `/onboarding/${kind}-hero.webp`;
}

/** `n` is 1, 2 or 3. */
export function productPhoto(kind: ShopKind, n: 1 | 2 | 3): string {
  return `/onboarding/${kind}-${n}.webp`;
}

/** A price as the shop shows it: taka, in the reader's digits. */
export function formatTaka(amount: number, locale: string): string {
  return `৳${new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-IN").format(amount)}`;
}
