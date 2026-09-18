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
    id: "2026-09-18-fraud-check-new-provider",
    date: "2026-09-18",
    version: "4.7.1",
    tag: "improved",
    title: {
      en: "Fraud Check runs on a new data source",
      bn: "ফ্রড চেক এখন নতুন ডেটা সোর্সে চলছে",
    },
    body: {
      en: "The courier delivery history behind Fraud Check now comes from a new provider. The success ratio and the courier breakdown work exactly as before, and there is nothing for you to change.",
      bn: "ফ্রড চেকের পেছনের কুরিয়ার ডেলিভারি হিস্ট্রি এখন নতুন একটি সোর্স থেকে আসছে। সাকসেস রেশিও আর কুরিয়ারভিত্তিক হিসাব আগের মতোই কাজ করবে, আপনাকে কিছুই বদলাতে হবে না।",
    },
    href: "/orders",
  },
  {
    id: "2026-09-16-promotions-and-shipping-in-settings",
    date: "2026-09-16",
    version: "4.7.0",
    tag: "improved",
    title: {
      en: "Banners, Pop-up, CTA and Shipping moved to Settings",
      bn: "ব্যানার, পপ-আপ, সিটিএ আর শিপিং এখন সেটিংসে",
    },
    body: {
      en: "Banners, Pop-up, CTA and Shipping are no longer in the sidebar. Find Banners, Pop-up and CTA under Settings → Promotions, and your delivery zones, methods and rates under Settings → Shipping. Old links still take you there.",
      bn: "ব্যানার, পপ-আপ, সিটিএ আর শিপিং এখন আর সাইডবারে নেই। ব্যানার, পপ-আপ আর সিটিএ পাবেন সেটিংস → প্রোমোশন-এ, আর ডেলিভারির জোন, পদ্ধতি ও রেট পাবেন সেটিংস → শিপিং-এ। পুরোনো লিংকগুলোও আপনাকে সেখানেই নিয়ে যাবে।",
    },
    href: "/settings?tab=promotions",
  },
  {
    id: "2026-09-16-uploads-better-protected",
    date: "2026-09-16",
    version: "4.7.0",
    tag: "fixed",
    title: {
      en: "Uploaded images are better protected",
      bn: "আপলোড করা ছবি এখন আরও সুরক্ষিত",
    },
    body: {
      en: "Images and files you upload can now only be used and removed by your own store.",
      bn: "আপনার আপলোড করা ছবি ও ফাইল এখন শুধু আপনার নিজের স্টোরই ব্যবহার করতে ও মুছতে পারবে।",
    },
  },
  {
    id: "2026-09-15-safer-courier-sending-and-statuses",
    date: "2026-09-15",
    version: "4.6.3",
    tag: "fixed",
    title: {
      en: "Safer courier sending and correct delivery statuses",
      bn: "নিরাপদ কুরিয়ার পাঠানো আর সঠিক ডেলিভারি স্ট্যাটাস",
    },
    body: {
      en: "If Steadfast does not answer or has an error while sending, the order goes back to not sent, and sending it again first checks Steadfast so you don't end up with a duplicate parcel. Delivery statuses now update correctly instead of showing Unknown, and orders stuck on Unknown fix themselves over the next few updates, so parcel status numbers in Analytics may change. Dashboard pages also keep working during brief server hiccups, though they may load a little slower.",
      bn: "Steadfast-এ পাঠানোর সময় সাড়া না পেলে বা কোনো সমস্যা হলে অর্ডারটি আবার \"পাঠানো হয়নি\" অবস্থায় ফিরে যায়, আর আবার পাঠালে আগে Steadfast-এ যাচাই করা হয়, যাতে একই পার্সেল দুবার তৈরি না হয়। ডেলিভারি স্ট্যাটাস এখন Unknown না দেখিয়ে সঠিকভাবে আপডেট হয়, আর Unknown-এ আটকে থাকা অর্ডারগুলো পরের কয়েকটি আপডেটে নিজে থেকেই ঠিক হয়ে যাবে, তাই Analytics-এ পার্সেল স্ট্যাটাসের সংখ্যা বদলে যেতে পারে। সার্ভারে সাময়িক সমস্যা হলেও ড্যাশবোর্ডের পেজগুলো এখন চালু থাকে, তবে একটু ধীরে লোড হতে পারে।",
    },
  },
  {
    id: "2026-09-15-ad-purchases-count-real-orders",
    date: "2026-09-15",
    version: "4.6.2",
    tag: "improved",
    title: {
      en: "Ad purchases now count real orders",
      bn: "বিজ্ঞাপনে এখন আসল অর্ডারই পারচেজ",
    },
    body: {
      en: "Facebook Ads now counts a cash on delivery order as a purchase when you confirm it within 7 days, and a prepaid order when the customer pays, so your purchase numbers may drop to the real ones. TikTok keeps counting every order as \"Place an Order\" and adds a new Purchase count for confirmed and paid orders; switch your TikTok campaign goal to Purchase to use it. Customer phone numbers are now sent with the Bangladesh country code, so Facebook and TikTok can match more buyers to your ads, and ads may take a few days to adjust.",
      bn: "Facebook বিজ্ঞাপনে ক্যাশ অন ডেলিভারি অর্ডার এখন পারচেজ হিসেবে গণ্য হবে ৭ দিনের মধ্যে আপনি কনফার্ম করলে, আর প্রিপেইড অর্ডার গ্রাহক পেমেন্ট করলে, তাই পারচেজের সংখ্যা কমে আসল সংখ্যায় আসতে পারে। TikTok আগের মতোই প্রতিটি অর্ডারকে \"Place an Order\" হিসেবে গুনবে, আর কনফার্ম ও পেমেন্ট হওয়া অর্ডারের জন্য নতুন একটি Purchase গণনা যোগ করবে; এটি ব্যবহার করতে আপনার TikTok ক্যাম্পেইনের লক্ষ্য Purchase-এ বদলে দিন। গ্রাহকের ফোন নম্বর এখন বাংলাদেশের কান্ট্রি কোডসহ পাঠানো হয়, ফলে Facebook ও TikTok আরও বেশি ক্রেতাকে আপনার বিজ্ঞাপনের সাথে মেলাতে পারে, আর বিজ্ঞাপন মানিয়ে নিতে কয়েক দিন সময় লাগতে পারে।",
    },
  },
  {
    id: "2026-09-15-sidebar-starts-collapsed",
    date: "2026-09-15",
    version: "4.6.1",
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
    version: "4.6.0",
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
    version: "4.5.2",
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
    version: "4.5.1",
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
    version: "4.5.1",
    tag: "improved",
    title: {
      en: "Clear reasons when an order can't save",
      bn: "অর্ডার সংরক্ষণ না হলে কারণ স্পষ্ট দেখাবে",
    },
    body: {
      en: "If an order change can't be saved, you now see why in plain words, such as a missing delivery zone or not enough stock. Confusing technical error messages are gone.",
      bn: "অর্ডারের পরিবর্তন সংরক্ষণ না হলে এখন সহজ ভাষায় কারণ দেখাবে, যেমন ডেলিভারি জোন বাছা হয়নি বা যথেষ্ট স্টক নেই। দুর্বোধ্য টেকনিক্যাল ত্রুটির বার্তা আর দেখাবে না।",
    },
    href: "/orders",
  },
  {
    id: "2026-09-14-faster-order-product-pages",
    date: "2026-09-14",
    version: "4.5.0",
    tag: "improved",
    title: {
      en: "Faster order and product pages",
      bn: "অর্ডার ও পণ্যের পেজ এখন আরও দ্রুত",
    },
    body: {
      en: "Your orders, order details, products, categories and inventory pages load faster and stay fast as your store grows. Sending many orders to the courier at once is quicker too.",
      bn: "অর্ডার তালিকা, অর্ডারের বিস্তারিত, পণ্য, ক্যাটাগরি ও ইনভেন্টরি পেজ এখন দ্রুত লোড হয়, স্টোর বড় হলেও ধীর হয় না। একসাথে অনেক অর্ডার কুরিয়ারে পাঠানোও এখন দ্রুত হয়।",
    },
    href: "/orders",
  },
  {
    id: "2026-09-14-order-editor-fresh-stock",
    date: "2026-09-14",
    version: "4.5.0",
    tag: "improved",
    title: {
      en: "Order editor opens faster with fresh stock",
      bn: "অর্ডার এডিটর দ্রুত খোলে, স্টক থাকে হালনাগাদ",
    },
    body: {
      en: "Editing an order or creating a new one loads product options in one go. Stock in the editor updates after orders or inventory change, so the numbers stay current.",
      bn: "অর্ডার সম্পাদনা বা নতুন অর্ডার তৈরির সময় পণ্যের অপশন এখন একবারেই লোড হয়। অর্ডার বা ইনভেন্টরি বদলালে এডিটরের স্টকও হালনাগাদ হয়, তাই সংখ্যাগুলো হালনাগাদ থাকে।",
    },
    href: "/orders/new",
  },
  {
    id: "2026-09-14-bulk-delete-and-restore",
    date: "2026-09-14",
    version: "4.5.0",
    tag: "improved",
    title: {
      en: "Bulk delete and restore handle big selections",
      bn: "একসাথে অনেক আইটেম মুছুন বা ফিরিয়ে আনুন",
    },
    body: {
      en: "Deleting products in bulk, and restoring or permanently deleting items in Trash, now handles large selections in one go. If a few items can't be done, you see which ones, and only those stay selected.",
      bn: "একসাথে অনেক পণ্য মুছে ফেলা, আর ট্র্যাশ থেকে পুনরুদ্ধার বা স্থায়ীভাবে মুছে ফেলা এখন বড় নির্বাচনেও একবারে হয়। কিছু আইটেম বাদ পড়লে কোনগুলো হয়নি তা দেখাবে, আর শুধু সেগুলোই নির্বাচিত থাকবে।",
    },
    href: "/trash",
  },
  {
    id: "2026-09-14-drag-reorder-saves-instantly",
    date: "2026-09-14",
    version: "4.5.0",
    tag: "improved",
    title: {
      en: "Drag-to-reorder saves instantly",
      bn: "টেনে সাজানো সঙ্গে সঙ্গে সংরক্ষিত হয়",
    },
    body: {
      en: "Reordering products in a category saves the moment you drop, no matter how many products the category has.",
      bn: "ক্যাটাগরির পণ্য টেনে সাজালে ছেড়ে দেওয়ামাত্রই সংরক্ষিত হয়, ক্যাটাগরিতে যত পণ্যই থাকুক।",
    },
    href: "/products",
  },
  {
    id: "2026-09-14-variants-product-search",
    date: "2026-09-14",
    version: "4.5.0",
    tag: "improved",
    title: {
      en: "Find products faster on the Variants page",
      bn: "ভেরিয়েন্ট পেজে পণ্য খুঁজুন আরও দ্রুত",
    },
    body: {
      en: "Pick a product on the Variants page by typing its name in the new search box. Search results now have a Load more button, and a product with more than 100 variants shows all of them.",
      bn: "ভেরিয়েন্ট পেজে নতুন সার্চ বক্সে নাম লিখে পণ্য বেছে নিন। সার্চ ফলাফলে এখন \"আরও দেখুন\" বাটন আছে, আর ১০০টির বেশি ভেরিয়েন্টের পণ্যেও সবগুলো দেখাবে।",
    },
    href: "/variants",
  },
  {
    id: "2026-09-14-faster-checkout",
    date: "2026-09-14",
    version: "4.5.0",
    tag: "improved",
    title: {
      en: "Faster checkout for your shoppers",
      bn: "ক্রেতাদের জন্য আরও দ্রুত চেকআউট",
    },
    body: {
      en: "Your store's checkout page loads faster, even when you have many delivery zones or a shopper has a full cart.",
      bn: "আপনার স্টোরের চেকআউট পেজ এখন দ্রুত লোড হয়, অনেক ডেলিভারি জোন থাকলে বা ক্রেতার কার্টে অনেক পণ্য থাকলেও।",
    },
  },
  {
    id: "2026-09-14-simpler-store-info",
    date: "2026-09-14",
    version: "4.4.3",
    tag: "improved",
    title: {
      en: "Simpler Store info settings",
      bn: "স্টোরের তথ্য সেটিংস আরও সহজ",
    },
    body: {
      en: "Store info in Settings no longer shows storefront connection fields that your store doesn't need.",
      bn: "সেটিংসের স্টোরের তথ্যে এখন আর স্টোরফ্রন্ট সংযোগের এমন ঘর দেখায় না, যা আপনার স্টোরের দরকার নেই।",
    },
    href: "/settings",
  },
  {
    id: "2026-09-12-store-stays-open",
    date: "2026-09-12",
    version: "4.4.1",
    tag: "fixed",
    title: {
      en: "Your store stays open during brief glitches",
      bn: "সাময়িক সমস্যাতেও স্টোর খোলা থাকে",
    },
    body: {
      en: "A short hiccup on our servers no longer takes your store offline or loses an order a shopper has already placed.",
      bn: "আমাদের সার্ভারে সাময়িক সমস্যা হলেও আপনার স্টোর আর বন্ধ হয়ে যায় না, আর ক্রেতার দেওয়া অর্ডারও হারিয়ে যায় না।",
    },
  },
  {
    id: "2026-09-12-quick-order-simple-products",
    date: "2026-09-12",
    version: "4.4.0",
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
    id: "2026-09-11-free-delivery",
    date: "2026-09-11",
    version: "4.4.0",
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
    version: "4.3.0",
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
];
