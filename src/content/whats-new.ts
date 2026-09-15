/**
 * What's new: merchant-facing release notes shown in the profile menu's side panel.
 *
 * Rules for adding an entry:
 * - Newest first. Put the new entry at the top.
 * - Keep AT MOST 30 entries (WHATS_NEW_MAX_ENTRIES). When adding the 31st, delete the oldest.
 * - `id` is stable and unique forever: `<date>-<short-slug>`. Never rename or reuse one; the
 *   unread dot compares the newest id with the one a merchant last saw.
 * - `date` is the day the change reached merchants (YYYY-MM-DD).
 * - `version` is the dashboard version it shipped in. For a storefront or platform change,
 *   use the dashboard version that was live when it went out.
 * - `href` is an optional internal dashboard path WITHOUT the locale (e.g. "/orders").
 * - Write for merchants: what they can now do or what got better, in plain words. Never
 *   mention code. Title under ~8 words, body 1-3 short sentences, natural Bangla in `bn`.
 * - This list belongs to the client line only: list only changes released on it.
 */

export const WHATS_NEW_TAGS = ["new", "improved", "fixed"] as const;

export type WhatsNewTag = (typeof WHATS_NEW_TAGS)[number];

export interface LocalizedText {
  en: string;
  bn: string;
}

export interface WhatsNewEntry {
  id: string;
  date: string;
  version: string;
  tag: WhatsNewTag;
  title: LocalizedText;
  body: LocalizedText;
  href?: string;
}

export const WHATS_NEW_MAX_ENTRIES = 30;

export const WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
  {
    id: "2026-09-15-ad-purchases-count-real-orders",
    date: "2026-09-15",
    version: "3.3.2",
    tag: "improved",
    title: {
      en: "Ad purchases now count real orders",
      bn: "বিজ্ঞাপনে এখন আসল অর্ডারই পারচেজ",
    },
    body: {
      en: "Facebook Ads now counts a cash on delivery order as a purchase when you confirm it within 7 days, and a prepaid order when the customer pays, so your purchase numbers may drop to the real ones. TikTok keeps counting every order as \"Place an Order\" and adds a new Purchase count for confirmed and paid orders; switch your TikTok campaign goal to Purchase to use it. Customer phone numbers are now sent with the Bangladesh country code, so Facebook and TikTok can match more buyers to your ads, and ads may take a few days to adjust.",
      bn: "Facebook বিজ্ঞাপনে ক্যাশ অন ডেলিভারি অর্ডার এখন পারচেজ হিসেবে গণ্য হবে ৭ দিনের মধ্যে আপনি কনফার্ম করলে, আর প্রিপেইড অর্ডার গ্রাহক পেমেন্ট করলে, তাই পারচেজের সংখ্যা কমে আসল সংখ্যায় আসতে পারে। TikTok আগের মতোই প্রতিটি অর্ডারকে \"Place an Order\" হিসেবে গুনবে, আর কনফার্ম ও পেমেন্ট হওয়া অর্ডারের জন্য নতুন একটি Purchase গণনা যোগ করবে; এটি ব্যবহার করতে আপনার TikTok ক্যাম্পেইনের লক্ষ্য Purchase-এ বদলে নিন। গ্রাহকের ফোন নম্বর এখন বাংলাদেশের কান্ট্রি কোডসহ পাঠানো হয়, ফলে Facebook ও TikTok আরও বেশি ক্রেতাকে আপনার বিজ্ঞাপনের সাথে মেলাতে পারে, আর বিজ্ঞাপন মানিয়ে নিতে কয়েক দিন সময় লাগতে পারে।",
    },
  },
  {
    id: "2026-09-15-sidebar-starts-collapsed",
    date: "2026-09-15",
    version: "3.3.1",
    tag: "improved",
    title: {
      en: "More room for your pages",
      bn: "পেজে এখন আরও বেশি জায়গা",
    },
    body: {
      en: "On computers the sidebar now starts collapsed, showing only icons. Click the button at the top of the sidebar to expand it anytime.",
      bn: "কম্পিউটারে সাইডবার এখন সংকুচিত অবস্থায় শুরু হয়, শুধু আইকন দেখায়। যেকোনো সময় সাইডবারের একেবারে উপরের বোতামে ক্লিক করে এটি প্রসারিত করুন।",
    },
  },
  {
    id: "2026-09-15-whats-new-panel",
    date: "2026-09-15",
    version: "3.3.0",
    tag: "new",
    title: {
      en: "See what's new in your dashboard",
      bn: "ড্যাশবোর্ডে নতুন কী এল দেখুন",
    },
    body: {
      en: "Open What's new from your profile menu to see recent updates. A small dot lets you know when something new arrives.",
      bn: "প্রোফাইল মেনুর \"নতুন কী আছে\" থেকে সাম্প্রতিক আপডেটগুলো দেখুন। নতুন কিছু এলে ছোট একটি বিন্দু আপনাকে জানিয়ে দেবে।",
    },
  },
  {
    id: "2026-09-15-order-totals-wait-for-zone",
    date: "2026-09-15",
    version: "3.2.2",
    tag: "fixed",
    title: {
      en: "Order totals wait for a delivery zone",
      bn: "ডেলিভারি জোন বাছলেই অর্ডারের মোট দেখাবে",
    },
    body: {
      en: "When you create or edit an order, totals appear as soon as you pick a delivery zone. Until then the page asks you to choose one, instead of showing 0 or loading forever.",
      bn: "অর্ডার তৈরি বা সম্পাদনার সময় ডেলিভারি জোন বেছে নিলেই মোট হিসাব দেখাবে। তার আগে পেজটি জোন বেছে নিতে বলবে, ০ বা অনবরত লোডিং আর দেখাবে না।",
    },
    href: "/orders/new",
  },
  {
    id: "2026-09-15-order-edits-save",
    date: "2026-09-15",
    version: "3.2.1",
    tag: "fixed",
    title: {
      en: "Order edits save reliably",
      bn: "অর্ডার সম্পাদনা এখন ঠিকমতো সংরক্ষণ হয়",
    },
    body: {
      en: "Order changes save again, even if the address has only a thana or an item was later changed or removed. All your delivery zones now show, and you see a confirmation after saving.",
      bn: "ঠিকানায় শুধু থানা থাকলেও, বা কোনো পণ্য পরে ক্যাটালগে বদলানো বা মুছে ফেলা হলেও, অর্ডারের পরিবর্তন এখন ঠিকমতো সংরক্ষণ হয়। তালিকায় এখন আপনার সব ডেলিভারি জোন দেখা যায়, আর অর্ডার সংরক্ষণ হলে নিশ্চিতকরণ বার্তা দেখাবে।",
    },
    href: "/orders",
  },
  {
    id: "2026-09-15-order-save-clear-reasons",
    date: "2026-09-15",
    version: "3.2.1",
    tag: "improved",
    title: {
      en: "Clear reasons when an order can't save",
      bn: "অর্ডার সংরক্ষণ না হলে কারণ স্পষ্ট দেখাবে",
    },
    body: {
      en: "If an order change can't be saved, you now see why in plain words, such as a missing delivery zone or a product that needs a variant chosen. Confusing technical error messages are gone.",
      bn: "অর্ডারের পরিবর্তন সংরক্ষণ না হলে এখন সহজ ভাষায় কারণ দেখাবে, যেমন ডেলিভারি জোন বাছা হয়নি বা কোনো পণ্যের ভেরিয়েন্ট বাছা হয়নি। দুর্বোধ্য টেকনিক্যাল ত্রুটির বার্তা আর দেখাবে না।",
    },
    href: "/orders",
  },
  {
    id: "2026-09-12-quick-order-simple-products",
    date: "2026-09-12",
    version: "3.2.0",
    tag: "fixed",
    title: {
      en: "Quick order works for products without options",
      bn: "অপশন ছাড়া পণ্যেও কুইক অর্ডার কাজ করে",
    },
    body: {
      en: "In your store's quick order popup, Order Now and Add to cart now work for products with no size or color to choose. The popup also shows free delivery when a product has it.",
      bn: "আপনার স্টোরের কুইক অর্ডার পপআপে সাইজ বা রং বাছাই নেই এমন পণ্যেও এখন \"এখনই অর্ডার করুন\" ও \"কার্টে যোগ করুন\" কাজ করে। পণ্যে ফ্রি ডেলিভারি থাকলে পপআপেও তা দেখায়।",
    },
  },
  {
    id: "2026-09-11-product-pages-show-changes",
    date: "2026-09-11",
    version: "3.2.0",
    tag: "fixed",
    title: {
      en: "Product edits now reach your product pages",
      bn: "পণ্যের পরিবর্তন এখন পণ্য পেজেও দেখায়",
    },
    body: {
      en: "When you edit a product or a category, the change now shows on its product page in your store, not only in product lists. Before, a product page could keep showing old details for a while.",
      bn: "কোনো পণ্য বা ক্যাটাগরি সম্পাদনা করলে সেই পরিবর্তন এখন শুধু পণ্যের তালিকায় নয়, আপনার স্টোরের পণ্য পেজেও দেখায়। আগে পণ্য পেজে কিছুক্ষণ পুরোনো তথ্যই থেকে যেত।",
    },
    href: "/products",
  },
  {
    id: "2026-09-11-free-delivery",
    date: "2026-09-11",
    version: "3.2.0",
    tag: "new",
    title: {
      en: "Offer free delivery on products or categories",
      bn: "পণ্য বা ক্যাটাগরিতে ফ্রি ডেলিভারি দিন",
    },
    body: {
      en: "Turn on free delivery for a product or a whole category. Shoppers see a Free delivery label in your store, and an order ships free only when every item in it qualifies.",
      bn: "কোনো পণ্য বা পুরো ক্যাটাগরির জন্য ফ্রি ডেলিভারি চালু করুন। ক্রেতারা আপনার স্টোরে ফ্রি ডেলিভারি লেবেল দেখবেন, আর অর্ডারের সব পণ্য যোগ্য হলেই ডেলিভারি ফ্রি হবে।",
    },
    href: "/products",
  },
  {
    id: "2026-09-11-repeat-order-cooldown",
    date: "2026-09-11",
    version: "3.1.0",
    tag: "new",
    title: {
      en: "Stop repeat orders from one phone number",
      bn: "একই নম্বর থেকে বারবার অর্ডার ঠেকান",
    },
    body: {
      en: "In Settings, under Checkout, set a waiting time in minutes. Your store then refuses a second order from the same phone number within that time and tells the shopper, in their language, how long to wait.",
      bn: "সেটিংসের চেকআউট অংশে মিনিট হিসেবে একটি অপেক্ষার সময় দিন। ওই সময়ের মধ্যে একই ফোন নম্বর থেকে আরেকটি অর্ডার এলে স্টোর তা নেবে না, আর ক্রেতাকে তার ভাষায় জানিয়ে দেবে কতক্ষণ অপেক্ষা করতে হবে।",
    },
    href: "/settings?tab=checkout",
  },
  {
    id: "2026-09-08-passkey-on-each-device",
    date: "2026-09-08",
    version: "3.0.01",
    tag: "improved",
    title: {
      en: "Add a passkey on each device you use",
      bn: "প্রতিটি ডিভাইসে পাসকি যোগ করুন",
    },
    body: {
      en: "After you sign in with an email link on a device without a passkey, you can add one there for quicker sign-in next time. You can also skip this step.",
      bn: "পাসকি নেই এমন ডিভাইসে ইমেইল লিংক দিয়ে সাইন ইন করার পর সেখানেই একটি পাসকি যোগ করতে পারবেন, তাতে পরের বার দ্রুত সাইন ইন হবে। চাইলে ধাপটি এড়িয়েও যেতে পারেন।",
    },
  },
  {
    id: "2026-09-08-variant-price-note",
    date: "2026-09-08",
    version: "3.0.01",
    tag: "new",
    title: {
      en: "Add a note shoppers see on a variant",
      bn: "ভেরিয়েন্টে ক্রেতাদের জন্য নোট যোগ করুন",
    },
    body: {
      en: "On the Variants page, add a short note to any variant, such as \"This size runs large\". Shoppers see it in your store when they pick that variant.",
      bn: "ভেরিয়েন্ট পেজে যেকোনো ভেরিয়েন্টে ছোট একটি নোট যোগ করুন, যেমন \"এই সাইজটি একটু বড় হয়\"। ক্রেতারা আপনার স্টোরে ওই ভেরিয়েন্ট বাছলেই নোটটি দেখতে পাবেন।",
    },
    href: "/variants",
  },
  {
    id: "2026-09-08-variant-sku-search",
    date: "2026-09-08",
    version: "3.0.01",
    tag: "improved",
    title: {
      en: "Search variants by SKU across all products",
      bn: "সব পণ্যের মধ্যে SKU দিয়ে ভেরিয়েন্ট খুঁজুন",
    },
    body: {
      en: "On the Variants page, search by SKU or option without picking a product first. While you edit a variant, attribute types the product doesn't use stay hidden until you clear one checkbox.",
      bn: "ভেরিয়েন্ট পেজে আগে পণ্য না বেছেই SKU বা অপশন দিয়ে খুঁজুন। ভেরিয়েন্ট সম্পাদনার সময় পণ্যে ব্যবহার হয়নি এমন অ্যাট্রিবিউট লুকানো থাকে, একটি টিক তুলে দিলেই সবগুলো দেখা যায়।",
    },
    href: "/variants",
  },
  {
    id: "2026-09-08-inventory-sync",
    date: "2026-09-08",
    version: "3.0.01",
    tag: "new",
    title: {
      en: "Sync your inventory in one click",
      bn: "এক ক্লিকে ইনভেন্টরি সিঙ্ক করুন",
    },
    body: {
      en: "The new Sync button on the Inventory page fixes stock records that no longer match your products and variants, and refreshes stock. Products in the trash no longer show in the inventory list.",
      bn: "ইনভেন্টরি পেজের নতুন সিঙ্ক বাটন আপনার পণ্য ও ভেরিয়েন্টের সাথে না মেলা স্টক রেকর্ড ঠিক করে এবং স্টক হালনাগাদ করে। ট্র্যাশে থাকা পণ্য আর ইনভেন্টরি তালিকায় দেখায় না।",
    },
    href: "/inventory",
  },
  {
    id: "2026-08-30-invoice-look-and-terms",
    date: "2026-08-30",
    version: "3.0.01",
    tag: "improved",
    title: {
      en: "Invoices with a new look and your terms",
      bn: "নতুন রূপে ইনভয়েস, সঙ্গে আপনার শর্তাবলী",
    },
    body: {
      en: "Order invoices have a cleaner layout and show the total amount in words. Add your own terms and conditions in Settings, under Store Info, one per line. A progress bar shows while an invoice is being prepared.",
      bn: "অর্ডার ইনভয়েস এখন আরও গোছানো, আর মোট টাকার পরিমাণ কথায় লেখা থাকে। সেটিংসের স্টোর তথ্য অংশে প্রতি লাইনে একটি করে নিজের শর্তাবলী যোগ করুন। ইনভয়েস তৈরির সময় একটি প্রগ্রেস বার দেখায় কতদূর হলো।",
    },
    href: "/settings?tab=store",
  },
  {
    id: "2026-08-30-order-numbers-without-zeros",
    date: "2026-08-30",
    version: "3.0.01",
    tag: "improved",
    title: {
      en: "Order numbers without extra zeros",
      bn: "অর্ডার নম্বরে আর বাড়তি শূন্য নেই",
    },
    body: {
      en: "Order numbers now show without leading zeros, so 00000004 reads as 4. You see this in your dashboard and on your store's order confirmation and payment pages.",
      bn: "অর্ডার নম্বর এখন সামনের বাড়তি শূন্য ছাড়া দেখায়, তাই নম্বর ছোট ও পড়তে সহজ। ড্যাশবোর্ডে এবং আপনার স্টোরের অর্ডার নিশ্চিতকরণ ও পেমেন্ট পেজে এটি দেখবেন।",
    },
    href: "/orders",
  },
  {
    id: "2026-08-22-team-roles-and-access",
    date: "2026-08-22",
    version: "3.0.01",
    tag: "new",
    title: {
      en: "Invite your team with roles and access",
      bn: "টিমকে আমন্ত্রণ জানান, রোল ও অ্যাক্সেস ঠিক করুন",
    },
    body: {
      en: "In Settings, under Team, invite people by email and give each one a role: Admin, Manager, Staff or Viewer. You can change what each role may do, and limit a member to certain categories so they see only those products and orders.",
      bn: "সেটিংসের টিম অংশ থেকে ইমেইলে সদস্যদের আমন্ত্রণ জানান এবং প্রত্যেককে একটি রোল দিন: Admin, Manager, Staff বা Viewer। প্রতিটি রোল কী করতে পারবে তা বদলাতে পারেন, আর কোনো সদস্যকে নির্দিষ্ট ক্যাটাগরিতে সীমিত রাখলে তিনি শুধু সেই ক্যাটাগরির পণ্য ও অর্ডার দেখবেন।",
    },
    href: "/settings?tab=team",
  },
  {
    id: "2026-08-22-passkey-sign-in",
    date: "2026-08-22",
    version: "3.0.01",
    tag: "new",
    title: {
      en: "Sign in with a passkey or email link",
      bn: "পাসকি বা ইমেইল লিংকে সাইন ইন করুন",
    },
    body: {
      en: "Sign in with a passkey using your fingerprint, face or screen lock, or with a sign-in link sent to your email. Passwords and two-step codes are no longer needed. Manage your passkeys in Settings, under Account.",
      bn: "আঙুলের ছাপ, মুখ বা স্ক্রিন লক দিয়ে পাসকিতে, অথবা ইমেইলে পাঠানো সাইন-ইন লিংকে সাইন ইন করুন। পাসওয়ার্ড ও দুই ধাপের কোড আর লাগে না। সেটিংসের অ্যাকাউন্ট অংশে আপনার পাসকিগুলো পরিচালনা করুন।",
    },
    href: "/settings?tab=account",
  },
];
