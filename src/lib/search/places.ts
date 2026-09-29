/**
 * The dashboard's own places in search: its pages, the Analytics sections, every Settings
 * section, the theme editor's pages, and a few things to do ("Add product"). Owner, 2026-09-29:
 * "search anything ... a tab, a section, whatever".
 *
 * Found here, in the browser, as the merchant types -- nothing asks the server. Each place shows
 * only to someone who could open it: the same rules the sidebar and Settings use (`shows`, fed by
 * `useCanShowApp` and `useVisibleSettingsSections`).
 *
 * A place is found by its name in the dashboard's language and by its `words`: everyday words
 * for it in English AND Bangla, whichever language the dashboard is in ("steadfast" and "কুরিয়ার"
 * both find Integrations). The words are for finding, not for showing, so they live here rather
 * than in the message files.
 */

import { APP_CONFIG } from "@/config/apps";
import { SECTIONS } from "@/app/[locale]/(dashboard)/settings/settingsSections";
import { SECTIONS as ANALYTICS_SECTIONS } from "@/app/[locale]/(dashboard)/analytics/_components/SectionTabs";
import { SLOT_PAGES } from "@/lib/theme-editor/slot-catalogue";
import { THEME_EDITOR_HREF } from "@/lib/theme-editor/access";
import { EDITOR_PAGE_PARAM } from "@/lib/theme-editor/editor-url";

export type PlaceGroup = "places" | "actions";

/** What the person may open, from the hooks the sidebar and Settings use. */
export interface PlaceAccess {
  canShowApp: (appId: string) => boolean;
  has: (key: string) => boolean;
  /** Settings sections this person sees (`useVisibleSettingsSections`). */
  settingsSections: ReadonlySet<string>;
}

/**
 * A name to show: message keys (from the root), then `text` -- the words a few Settings sections
 * are still named by (`displayLabel`) -- joined with " · ".
 */
export type PlaceLabel = { keys: readonly string[]; text?: string };

export interface SearchPlace {
  id: string;
  group: PlaceGroup;
  href: string;
  label: PlaceLabel;
  words: readonly string[];
  shows: (access: PlaceAccess) => boolean;
}

/** Everyday words for each page, both languages. */
const APP_WORDS: Record<string, readonly string[]> = {
  analytics: ["reports", "stats", "statistics", "visitors", "sales report", "রিপোর্ট", "পরিসংখ্যান", "অ্যানালিটিক্স", "বিক্রির হিসাব"],
  products: ["catalog", "items", "goods", "পণ্য", "প্রোডাক্ট", "ক্যাটালগ"],
  orders: ["sales", "sell", "parcel", "অর্ডার", "বিক্রি", "পার্সেল"],
  customers: ["buyers", "clients", "গ্রাহক", "ক্রেতা", "কাস্টমার"],
  abandoned_checkouts: ["abandoned cart", "incomplete", "left checkout", "unfinished", "অসম্পূর্ণ", "চেকআউট"],
  accounts: ["shopper accounts", "sign in", "logins", "অ্যাকাউন্ট", "ক্রেতার অ্যাকাউন্ট"],
  wishlist: ["wished", "favourites", "favorites", "saved", "উইশলিস্ট", "পছন্দ"],
  brands: ["brand", "maker", "ব্র্যান্ড"],
  reviews: ["ratings", "stars", "feedback", "রিভিউ", "রেটিং", "মতামত"],
  categories: ["category", "departments", "collections", "ক্যাটাগরি", "বিভাগ"],
  support_tickets: ["support", "messages", "contact form", "inbox", "help", "সাপোর্ট", "মেসেজ", "টিকিট"],
  variants: ["sizes", "colours", "colors", "options", "ভ্যারিয়েন্ট", "সাইজ", "রং"],
  product_attributes: ["attribute", "size", "colour", "color", "অ্যাট্রিবিউট", "বৈশিষ্ট্য"],
  inventory: ["stock", "quantity", "out of stock", "স্টক", "মজুদ", "ইনভেন্টরি"],
  trash: ["deleted", "recycle bin", "restore", "মুছে ফেলা", "ট্র্যাশ", "ফেরত আনুন"],
  coupons: ["coupon", "discount", "promo code", "voucher", "offer", "কুপন", "ডিসকাউন্ট", "ছাড়"],
  blog: ["posts", "articles", "news", "ব্লগ", "পোস্ট", "লেখা"],
};

/** Everyday words for each Settings section, both languages. */
const SETTINGS_WORDS: Record<string, readonly string[]> = {
  store: ["store info", "shop name", "logo", "contact", "phone", "address", "identity", "social", "facebook page", "whatsapp", "currency", "দোকানের তথ্য", "লোগো", "ঠিকানা", "ফোন", "যোগাযোগ", "সোশ্যাল"],
  policies: ["terms", "privacy", "refund", "return policy", "conditions", "নীতিমালা", "শর্তাবলি", "রিফান্ড", "গোপনীয়তা"],
  customization: ["theme", "design", "look", "colours", "colors", "palette", "fonts", "থিম", "ডিজাইন", "রং", "কাস্টমাইজেশন"],
  promotions: ["pop-up", "popup", "offer", "announcement", "পপ-আপ", "অফার", "প্রচার"],
  checkout: ["checkout", "cash on delivery", "cod", "advance payment", "bkash", "nagad", "payment", "চেকআউট", "ক্যাশ অন ডেলিভারি", "অগ্রিম", "বিকাশ", "নগদ", "পেমেন্ট"],
  shipping: ["delivery charge", "shipping", "zones", "inside dhaka", "outside dhaka", "delivery", "ডেলিভারি চার্জ", "শিপিং", "ঢাকার ভিতরে", "ঢাকার বাইরে"],
  eav: ["dynamic fields", "custom fields", "extra fields", "ডায়নামিক ফিল্ড", "কাস্টম ফিল্ড"],
  apps: ["apps", "features", "turn on", "switch", "cart", "order tracking", "অ্যাপ", "ফিচার", "চালু"],
  integrations: ["courier", "steadfast", "pathao", "pixel", "facebook", "meta", "tiktok", "google", "analytics tag", "gtm", "api key", "কুরিয়ার", "স্টেডফাস্ট", "পাঠাও", "পিক্সেল", "ইন্টিগ্রেশন"],
  domains: ["domain", "custom domain", "website address", "www", "ডোমেইন", "ওয়েবসাইটের ঠিকানা"],
  notifications: ["email", "alerts", "notify", "ইমেইল", "নোটিফিকেশন", "জানানো"],
  team: ["staff", "members", "roles", "invite", "moderator", "manager", "permissions", "টিম", "স্টাফ", "সদস্য", "রোল", "আমন্ত্রণ"],
  account: ["profile", "my account", "passkey", "name", "প্রোফাইল", "আমার অ্যাকাউন্ট", "পাসকি"],
  security: ["security", "passkey", "safety", "নিরাপত্তা", "পাসকি"],
  sessions: ["devices", "signed in", "sign out", "logged in", "ডিভাইস", "সাইন আউট", "সেশন"],
  billing: ["plan", "subscription", "payment", "upgrade", "renew", "invoice", "প্ল্যান", "সাবস্ক্রিপশন", "বিল", "নবায়ন"],
};

const ANALYTICS_WORDS: Record<string, readonly string[]> = {
  sales: ["revenue", "income", "profit", "বিক্রি", "আয়"],
  traffic: ["visitors", "visits", "sources", "ভিজিটর", "দর্শক"],
  products: ["best sellers", "top products", "সেরা পণ্য"],
  districts: ["map", "places", "division", "জেলা", "ম্যাপ"],
  delivery: ["delivered", "returned", "courier", "ডেলিভারি", "ফেরত"],
  customers: ["new customers", "returning", "repeat", "নতুন গ্রাহক"],
  live: ["now", "real time", "right now", "লাইভ", "এখন"],
};

const EDITOR_WORDS: readonly string[] = ["theme editor", "edit shop", "design", "থিম এডিটর", "ডিজাইন"];

function page(id: string, href: string, words: readonly string[], shows: SearchPlace["shows"]): SearchPlace {
  return { id: `page:${id}`, group: "places", href, label: { keys: [`nav.${id}`] }, words, shows };
}

/** Every place and action there is; `visiblePlaces` keeps the ones a person may open. */
export const SEARCH_PLACES: readonly SearchPlace[] = [
  page("home", "/", ["dashboard", "overview", "start", "ড্যাশবোর্ড", "হোম"], () => true),
  ...Object.values(APP_CONFIG)
    .filter((app) => app.href !== null)
    .map((app) => page(app.id, app.href as string, APP_WORDS[app.id] ?? [], (a) => a.canShowApp(app.id))),
  page("activities", "/activities", ["activity", "history", "log", "who did", "কার্যকলাপ", "ইতিহাস"], (a) =>
    a.has("activity.view"),
  ),
  ...ANALYTICS_SECTIONS.filter((section) => section !== "overview").map(
    (section): SearchPlace => ({
      id: `analytics:${section}`,
      group: "places",
      href: `/analytics?section=${section}`,
      label: { keys: ["nav.analytics", `analyticsPage.sections.${section}`] },
      words: ANALYTICS_WORDS[section] ?? [],
      shows: (a) => a.canShowApp("analytics"),
    }),
  ),
  ...SECTIONS.map(
    (section): SearchPlace => ({
      id: `settings:${section.id}`,
      group: "places",
      href: `/settings?tab=${section.id}`,
      label:
        "labelKey" in section
          ? { keys: ["common.settings", `settings.${section.labelKey}`] }
          : { keys: ["common.settings"], text: section.displayLabel },
      words: SETTINGS_WORDS[section.id] ?? [],
      shows: (a) => a.settingsSections.has(section.id),
    }),
  ),
  ...SLOT_PAGES.map(
    (slot): SearchPlace => ({
      id: `editor:${slot}`,
      group: "places",
      href: `${THEME_EDITOR_HREF}?${EDITOR_PAGE_PARAM}=${slot}`,
      label: { keys: ["sidebar.searchThemeEditor", `themeEditor.slots.${slot}`] },
      words: EDITOR_WORDS,
      shows: (a) => a.settingsSections.has("customization"),
    }),
  ),
  {
    id: "action:add-product",
    group: "actions",
    href: "/products/new",
    label: { keys: ["pages.addProduct"] },
    words: ["new product", "create product", "নতুন পণ্য", "পণ্য যোগ"],
    shows: (a) => a.canShowApp("products") && a.has("products.create"),
  },
  {
    id: "action:add-order",
    group: "actions",
    href: "/orders/new",
    label: { keys: ["pages.addOrder"] },
    words: ["new order", "create order", "phone order", "নতুন অর্ডার", "অর্ডার যোগ"],
    shows: (a) => a.canShowApp("orders") && a.has("orders.edit"),
  },
  {
    id: "action:new-post",
    group: "actions",
    href: "/blog/new",
    label: { keys: ["nav.blogNew"] },
    words: ["write post", "new article", "নতুন পোস্ট", "লিখুন"],
    shows: (a) => a.canShowApp("blog") && a.has("blogs.manage"),
  },
  {
    id: "action:edit-design",
    group: "actions",
    href: THEME_EDITOR_HREF,
    label: { keys: ["sidebar.searchActionEditDesign"] },
    words: ["theme editor", "edit shop", "change design", "থিম এডিটর", "ডিজাইন বদলান"],
    shows: (a) => a.settingsSections.has("customization"),
  },
];

/** The places and actions this person may open. */
export function visiblePlaces(access: PlaceAccess, places: readonly SearchPlace[] = SEARCH_PLACES): SearchPlace[] {
  return places.filter((place) => place.shows(access));
}

/**
 * Lower case, with spaces, dashes and other marks gone -- the server's search reads words the
 * same way (engine/core/search_index.py `compact`): "store-info" finds "Store Info".
 */
export function compactText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, "");
}

function wordsOf(value: string): string[] {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
}

/** The name a person sees, in the dashboard's language. */
export function placeLabel(place: SearchPlace, t: (key: string) => string): string {
  return [...place.label.keys.map((key) => t(key)), ...(place.label.text ? [place.label.text] : [])].join(" · ");
}

/**
 * The best `limit` places for `query`: its name starts with it, then a word of its name or one
 * of its words does, then its name or its words contain it. Two letters at least -- one finds
 * half the dashboard.
 */
export function findPlaces(
  query: string,
  places: readonly SearchPlace[],
  labelOf: (place: SearchPlace) => string,
  limit: number,
): SearchPlace[] {
  const wanted = compactText(query);
  if (wanted.length < 2) return [];
  const ranked: { rank: number; index: number; place: SearchPlace }[] = [];
  places.forEach((place, index) => {
    const label = labelOf(place);
    const name = compactText(label);
    const words = place.words.map(compactText);
    let rank: number | null = null;
    if (name.startsWith(wanted)) rank = 0;
    else if (wordsOf(label).some((word) => word.startsWith(wanted)) || words.some((word) => word.startsWith(wanted)))
      rank = 1;
    else if (name.includes(wanted) || words.some((word) => word.includes(wanted))) rank = 2;
    if (rank !== null) ranked.push({ rank, index, place });
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.slice(0, limit).map((row) => row.place);
}
