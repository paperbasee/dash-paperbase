/**
 * Names for what the API sends as codes: a visit's source, a channel, a
 * courier, a payment method, a page. Brands keep their own names in every
 * language; the rest are looked up in the page's words.
 */
type Translate = (key: string) => string;

const BRANDS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  youtube: "YouTube",
  google: "Google",
  bing: "Bing",
  yahoo: "Yahoo",
  duckduckgo: "DuckDuckGo",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  telegram: "Telegram",
  imo: "imo",
  gmail: "Gmail",
};

/** The API's names for what it could not name (analytics/sources.py, traffic.py). */
const PLACEHOLDERS: Record<string, string> = {
  "(direct)": "names.direct",
  "(not tracked)": "names.notTracked",
  "(not set)": "names.notSet",
};

export function sourceName(source: string, t: Translate): string {
  if (PLACEHOLDERS[source]) return t(PLACEHOLDERS[source]);
  return BRANDS[source] ?? source;
}

const COURIERS: Record<string, string> = { steadfast: "Steadfast", pathao: "Pathao", redx: "RedX", paperfly: "Paperfly" };

export function courierName(courier: string, t: Translate): string {
  return courier ? (COURIERS[courier] ?? courier) : t("names.noCourier");
}

export function paymentName(method: string, t: Translate): string {
  return method === "bkash" ? "bKash" : method === "nagad" ? "Nagad" : t("names.cod");
}

const PAGE_KINDS = new Set([
  "home",
  "cart",
  "checkout",
  "search",
  "blog",
  "order_placed",
  "account",
  "wishlist",
  "all_products",
  "featured",
  "best_sellers",
  "new_arrivals",
  "contact",
  "reviews",
  "brands",
]);

/** A page by what it is: a product's or category's own name, or the kind of page. */
export function pageName(page: { kind: string; name: string; path: string }, t: Translate): string {
  if (page.kind === "product" || page.kind === "category") return page.name;
  if (PAGE_KINDS.has(page.kind)) return t(`pages.${page.kind}`);
  return page.path;
}
