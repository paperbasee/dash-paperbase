/**
 * What's new: merchant-facing release notes shown in the profile menu's side panel.
 *
 * Rules for adding an entry:
 * - Newest first. Put the new entry at the top.
 * - Keep AT MOST 30 entries (WHATS_NEW_MAX_ENTRIES). When adding the 31st, delete the oldest.
 * - `id` is stable and unique forever once SHIPPED: `<date>-<short-slug>`. Never rename or
 *   reuse a shipped one; the unread dot compares the newest id with the one a merchant
 *   last saw. An entry still held has been seen by nobody, so its id moves with its date
 *   when the batch is restamped — the only way the two can go on agreeing.
 * - `date` is the day the change reached merchants (YYYY-MM-DD).
 * - `version` is the dashboard version it shipped in. For a storefront or platform change,
 *   use the dashboard version that was live when it went out.
 * - `href` is an optional internal dashboard path WITHOUT the locale (e.g. "/orders").
 * - Write for merchants: what they can now do or what got better, in plain words. Never
 *   mention code. Title under ~8 words, body 1-3 short sentences, natural Bangla in `bn`.
 *
 * ## Entries written before their release — ONE DATE, RESTAMP IT ON THE DAY
 *
 * An entry is usually written with the work, and the work usually ships within days.
 * The theme system did not: it has been held since 2026-09-16, and everything built
 * since has been held behind it.
 *
 * **Every unreleased entry carries the same date**, because they all reach merchants
 * on the same day — the day the held work ships. That date is a placeholder until
 * then, and it is deliberately ONE date so that shipping day is one edit rather than
 * twenty: change every `2026-09-22` above the first released entry to the real day.
 *
 * How to tell them apart: production has had nothing newer than **4.7.1**, so any
 * entry above that version is held. As of 2026-09-22 that is the WHOLE list bar
 * one — the released entries have aged off the 30-entry cap, and only
 * `2026-09-15-whats-new-panel` remains, kept because a test pins it. So on
 * shipping day: restamp every `2026-09-22` in this file.
 *
 * This used to leave the list genuinely out of order, and
 * `tests/whats-new/content.test.ts` "is sorted newest first" FAILED for a real reason:
 * the fraud-check release was cut from an older base, so it shipped on 2026-09-18 at
 * 4.7.1 while entries written the day before carried 4.8.x. No arrangement fixes a
 * list where one entry has a later date AND a lower version — see the release-branch
 * trap in guidelines/releasing-safely.md. Giving the held batch one placeholder date
 * clears it honestly. Do not loosen the test instead; that would hide the next one.
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
    id: "2026-09-22-order-numbers-are-numbers",
    date: "2026-09-22",
    version: "4.37.0",
    tag: "improved",
    href: "/orders",
    title: {
      en: "Order numbers are just numbers",
      bn: "অর্ডার নম্বর এখন শুধুই নম্বর",
    },
    body: {
      en: "Your sixtieth order is now #60 instead of #00000060 — on the order list, the invoice, and in your shop. Nothing changed about which order is which, and a customer reading an older number off a printed invoice still finds their order.",
      bn: "আপনার ষাটতম অর্ডার এখন #00000060 নয়, #60 — অর্ডার তালিকায়, ইনভয়েসে এবং আপনার দোকানে। কোন অর্ডার কোনটি তা বদলায়নি, আর পুরোনো ইনভয়েসে ছাপা নম্বর দিয়েও ক্রেতা তাঁর অর্ডার খুঁজে পাবেন।",
    },
  },
  {
    id: "2026-09-22-prices-show-what-you-charge",
    date: "2026-09-22",
    version: "4.37.0",
    tag: "fixed",
    title: {
      en: "Your shop shows the exact amount you charge",
      bn: "আপনার দোকান ঠিক যত টাকা নেওয়া হবে তত-ই দেখাবে",
    },
    body: {
      en: "Your shop was rounding amounts to whole taka on screen while charging the real figure, so an order of ৳1,124.79 was shown to the shopper as ৳1,125 and recorded for you as ৳1,124.79. Prices now show their paisa when they have any, so the shelf, the basket, checkout, the invoice and your dashboard all say one number.",
      bn: "আপনার দোকান পর্দায় টাকার অঙ্ক পূর্ণসংখ্যায় দেখালেও নেওয়া হতো আসল অঙ্কটাই — তাই ৳১,১২৪.৭৯ টাকার অর্ডার ক্রেতাকে দেখানো হতো ৳১,১২৫, আর আপনার হিসাবে থাকত ৳১,১২৪.৭৯। এখন পয়সা থাকলে পয়সাসহ দেখাবে, ফলে পণ্যের দাম, ব্যাগ, চেকআউট, ইনভয়েস আর ড্যাশবোর্ড — সবখানে একই অঙ্ক।",
    },
  },
  {
    id: "2026-09-22-shoppers-can-track-an-order",
    date: "2026-09-22",
    version: "4.37.0",
    tag: "new",
    href: "/settings?tab=apps",
    title: {
      en: "Let shoppers track an order without an account",
      bn: "অ্যাকাউন্ট ছাড়াই ক্রেতারা অর্ডার ট্র্যাক করতে পারবেন",
    },
    body: {
      en: "Switch on Order tracking in Settings → Apps and a shopper can find their order with its number and the phone they ordered with — no account needed, which matters most if your checkout does not ask for an email. That screen now also lists the things that are always on, so you can see everything your shop has.",
      bn: "সেটিংস → অ্যাপস থেকে অর্ডার ট্র্যাকিং চালু করলে ক্রেতারা অর্ডার নম্বর আর যে ফোন নম্বর দিয়ে অর্ডার করেছেন তা দিয়েই অর্ডার খুঁজে নিতে পারবেন — অ্যাকাউন্ট লাগবে না, যা বিশেষভাবে কাজে লাগে যদি আপনার চেকআউটে ইমেইল না চাওয়া হয়। ওই পাতায় এখন সব সময় চালু থাকা জিনিসগুলোও দেখা যায়, তাই আপনার দোকানে কী কী আছে তার পুরোটাই এক জায়গায়।",
    },
  },
  {
    id: "2026-09-22-discount-codes-can-be-edited",
    date: "2026-09-22",
    version: "4.37.0",
    tag: "improved",
    href: "/coupons",
    title: {
      en: "Edit a discount code after making it",
      bn: "তৈরি করার পরেও ডিসকাউন্ট কোড বদলানো যাবে",
    },
    body: {
      en: "Every code now has an Edit beside it, so a minimum spend or an end date can be changed without making a second code. Paperbase also refuses a code that would take the whole of the smallest order it allows — 300 off with a minimum spend of 200 makes that order free and you still pay the delivery — and tells you which figure to raise.",
      bn: "প্রতিটি কোডের পাশে এখন সম্পাদনা আছে, তাই নতুন কোড না বানিয়েই সর্বনিম্ন কেনাকাটা বা শেষ তারিখ বদলানো যাবে। এছাড়া যে কোড সবচেয়ে ছোট যোগ্য অর্ডারটির পুরো টাকাই কেড়ে নেবে সেটি আর সংরক্ষণ হবে না — ২০০ টাকার সর্বনিম্নে ৩০০ টাকা ছাড় দিলে ওই অর্ডার ফ্রি হয়ে যায় আর ডেলিভারির খরচ আপনারই থাকে — আর কোন অঙ্কটি বাড়াতে হবে তা জানিয়ে দেওয়া হবে।",
    },
  },
  {
    id: "2026-09-22-lists-show-what-just-happened",
    date: "2026-09-22",
    version: "4.37.0",
    tag: "fixed",
    href: "/orders/abandoned",
    title: {
      en: "Lists your shoppers fill are always up to date",
      bn: "ক্রেতাদের কাজে ভরে ওঠা তালিকাগুলো সব সময় হালনাগাদ",
    },
    body: {
      en: "Abandoned checkouts, Accounts and Most wished-for were showing what they held a couple of minutes ago, so an abandoned checkout stayed on the list after the shopper had ordered. All three now fetch fresh every time you open them. Most wished-for also says plainly that it counts shoppers who were signed in when they saved.",
      bn: "অসমাপ্ত চেকআউট, অ্যাকাউন্ট আর সবচেয়ে পছন্দের — এই তালিকাগুলো কয়েক মিনিট আগের তথ্য দেখাত, তাই ক্রেতা অর্ডার করে ফেলার পরেও অসমাপ্ত চেকআউট তালিকায় থেকে যেত। এখন তিনটিই প্রতিবার খোলার সময় নতুন করে তথ্য আনে। সেই সাথে 'সবচেয়ে পছন্দের' পাতায় স্পষ্ট করে লেখা আছে যে এটি কেবল সাইন ইন করা অবস্থায় সেভ করা ক্রেতাদের গোনে।",
    },
  },
  {
    id: "2026-09-22-discount-codes",
    date: "2026-09-22",
    version: "4.36.0",
    tag: "new",
    href: "/coupons",
    title: {
      en: "Discount codes",
      bn: "ডিসকাউন্ট কোড",
    },
    body: {
      en: "Create a code shoppers type at checkout for money off — taka or a percent, with a minimum spend, an end date, and limits on how many times it can be used in total and per customer. The list shows how often each one has been used and what it has given away. A code never takes free delivery away, and switching one off leaves past orders exactly as they were.",
      bn: "এমন কোড তৈরি করুন যা ক্রেতারা চেকআউটে লিখে ছাড় পাবেন — টাকায় বা শতাংশে, সাথে সর্বনিম্ন কেনাকাটা, শেষ তারিখ, আর মোট ও প্রতি ক্রেতা কতবার ব্যবহার করা যাবে তার সীমা। তালিকায় দেখবেন প্রতিটি কোড কতবার ব্যবহার হয়েছে আর কত ছাড় দেওয়া হয়েছে। কোনো কোড ফ্রি ডেলিভারি কেড়ে নেবে না, আর কোড বন্ধ করলে আগের অর্ডারগুলো যেমন ছিল তেমনই থাকবে।",
    },
  },
  {
    id: "2026-09-22-accounts-in-every-shop",
    date: "2026-09-22",
    version: "4.36.0",
    tag: "improved",
    href: "/customers/accounts",
    title: {
      en: "Every shop has customer accounts",
      bn: "প্রতিটি দোকানেই এখন ক্রেতা অ্যাকাউন্ট",
    },
    body: {
      en: "Signing in is now part of every shop instead of something you switch on, so shoppers can always create an account with their email. Customers and Accounts have left Settings → Apps for the same reason. Letting shoppers save products is still yours to switch on, and it now works on its own.",
      bn: "সাইন ইন এখন প্রতিটি দোকানের অংশ, আলাদা করে চালু করার কিছু নেই — তাই ক্রেতারা সব সময় ইমেইল দিয়ে অ্যাকাউন্ট খুলতে পারবেন। একই কারণে গ্রাহক ও অ্যাকাউন্ট সেটিংস → অ্যাপস থেকে সরানো হয়েছে। ক্রেতারা পণ্য সেভ করতে পারবেন কি না, সেটি আগের মতোই আপনার হাতে, আর সেটি এখন একাই কাজ করে।",
    },
  },
  {
    id: "2026-09-22-shoppers-can-save-products",
    date: "2026-09-22",
    version: "4.35.0",
    tag: "new",
    href: "/products/wished",
    title: {
      en: "Shoppers can save products for later",
      bn: "ক্রেতারা পছন্দের পণ্য সেভ করে রাখতে পারবেন",
    },
    body: {
      en: "A shopper can tap the heart on any product and keep a list of what they want in your shop. Catalog → Most wished-for shows you what they are saving, most-saved first, so you know what to restock or put on offer. It stays off until you switch it on.",
      bn: "ক্রেতারা যেকোনো পণ্যের হার্ট চিহ্নে চাপ দিয়ে আপনার দোকানে পছন্দের পণ্যের তালিকা রাখতে পারবেন। ক্যাটালগ → সবচেয়ে পছন্দের পাতায় দেখতে পাবেন তারা কী সেভ করছেন, সবচেয়ে বেশি সেভ হওয়া পণ্য আগে — কোনটি আবার আনবেন বা অফারে দেবেন তা বুঝতে সুবিধা হবে। আপনি চালু না করা পর্যন্ত এটি বন্ধ থাকবে।",
    },
  },
  {
    id: "2026-09-22-see-who-nearly-bought",
    date: "2026-09-22",
    version: "4.35.0",
    tag: "new",
    href: "/orders/abandoned",
    title: {
      en: "See who nearly bought",
      bn: "যাঁরা প্রায় কিনেই ফেলেছিলেন তাঁদের দেখুন",
    },
    body: {
      en: "When a shopper types their phone number into your checkout and then leaves without ordering, you now see them under Sales → Abandoned checkouts, along with what was in their bag. You can call them back. Each one is kept for 30 days and then deleted.",
      bn: "কোনো ক্রেতা আপনার চেকআউটে ফোন নম্বর লিখে অর্ডার না করেই চলে গেলে এখন তাঁকে বিক্রয় → অসমাপ্ত চেকআউট-এ দেখতে পাবেন, সাথে তাঁর ব্যাগে কী ছিল তাও। আপনি ফোন করে যোগাযোগ করতে পারবেন। প্রতিটি তথ্য ৩০ দিন রাখা হয়, তারপর মুছে যায়।",
    },
  },
  {
    id: "2026-09-22-sales-and-shoppers-menus",
    date: "2026-09-22",
    version: "4.35.0",
    tag: "improved",
    href: "/orders",
    title: {
      en: "Sales and Shoppers open as menus",
      bn: "বিক্রয় ও ক্রেতা এখন মেনু হিসেবে খোলে",
    },
    body: {
      en: "Orders and Customers are now called Sales and Shoppers, and each one opens a short menu instead of going straight to a page — the same way Catalog already did. Your order list and your customer list are the first item inside, so nothing is further away than one more click.",
      bn: "অর্ডার ও গ্রাহক এখন বিক্রয় ও ক্রেতা নামে আছে, আর প্রতিটি সরাসরি পাতায় না গিয়ে একটি ছোট মেনু খোলে — ক্যাটালগ যেভাবে খুলত ঠিক সেভাবেই। ভেতরের প্রথম আইটেমই আপনার অর্ডার তালিকা ও গ্রাহক তালিকা, তাই কিছুই এক ক্লিকের বেশি দূরে নয়।",
    },
  },
  {
    id: "2026-09-22-popup-and-cta-always-there",
    date: "2026-09-22",
    version: "4.35.0",
    tag: "fixed",
    href: "/settings?tab=promotions",
    title: {
      en: "Pop-up and CTA no longer hide themselves",
      bn: "পপ-আপ আর সিটিএ আর নিজেরাই লুকাবে না",
    },
    body: {
      en: "Settings → Apps no longer has switches for Pop-up, CTA and Shipping. Turning the Pop-up or CTA switch off only hid its own editor, leaving no screen to turn it back on from. Both are always in Settings → Promotions now — to stop one showing in your shop, set it to inactive there.",
      bn: "সেটিংস → অ্যাপস-এ পপ-আপ, সিটিএ আর শিপিং-এর সুইচ আর নেই। পপ-আপ বা সিটিএ-র সুইচ বন্ধ করলে কেবল তার নিজের এডিটরই লুকিয়ে যেত, ফলে আবার চালু করার মতো কোনো পাতাই থাকত না। দুটিই এখন সব সময় সেটিংস → প্রোমোশন-এ থাকবে — দোকানে দেখানো বন্ধ করতে সেখান থেকে সেটিকে নিষ্ক্রিয় করুন।",
    },
  },
  {
    id: "2026-09-22-sidebar-highlights-one-page",
    date: "2026-09-22",
    version: "4.35.0",
    tag: "fixed",
    title: {
      en: "The menu highlights one page at a time",
      bn: "মেনুতে একসাথে একটি পাতাই হাইলাইট হবে",
    },
    body: {
      en: "Opening Abandoned checkouts also lit up Orders, and opening Accounts also lit up Customers, so the menu made it look like you were in two places at once. Only the page you are actually on is highlighted now.",
      bn: "অসমাপ্ত চেকআউট খুললে সাথে অর্ডারও হাইলাইট হয়ে থাকত, আর অ্যাকাউন্ট খুললে গ্রাহকও — ফলে মনে হতো আপনি একসাথে দুই জায়গায় আছেন। এখন আপনি আসলে যে পাতায় আছেন কেবল সেটিই হাইলাইট হবে।",
    },
  },
  {
    id: "2026-09-22-shoppers-can-have-an-account",
    date: "2026-09-22",
    tag: "new",
    version: "4.34.0",
    href: "/customers",
    title: {
      en: "Shoppers can have an account",
      bn: "ক্রেতারা অ্যাকাউন্ট খুলতে পারবেন",
    },
    body: {
      en: "A shopper can sign in to your shop with their email — no password, just a link we send them. Your Customers page now has an Accounts tab showing everyone who has. Every shop has this; there is nothing to switch on.",
      bn: "ক্রেতারা তাদের ইমেইল দিয়ে আপনার দোকানে সাইন ইন করতে পারবেন — কোনো পাসওয়ার্ড লাগবে না, আমরা একটি লিংক পাঠিয়ে দেব। গ্রাহক পাতায় এখন একটি অ্যাকাউন্ট ট্যাব আছে, যেখানে যারা সাইন ইন করেছেন তাদের দেখা যায়। প্রতিটি দোকানেই এটি আছে, আলাদা করে চালু করার কিছু নেই।",
    },
  },
  {
    id: "2026-09-22-shoppers-can-track-their-order",
    date: "2026-09-22",
    tag: "new",
    version: "4.34.0",
    title: {
      en: "Shoppers can track their own order",
      bn: "ক্রেতারা নিজেরাই অর্ডার ট্র্যাক করতে পারবেন",
    },
    body: {
      en: "With their order number and the phone they ordered with, a shopper can see where their parcel is. No account needed — which matters most if your checkout form does not ask for an email. It stays off until you switch it on.",
      bn: "অর্ডার নম্বর আর যে ফোন নম্বর দিয়ে অর্ডার করেছেন, সেটি দিলেই ক্রেতা দেখতে পাবেন তার পার্সেল কোথায় আছে। কোনো অ্যাকাউন্ট লাগবে না — বিশেষ করে যদি আপনার চেকআউট ফর্মে ইমেইল না চাওয়া হয়। আপনি চালু না করা পর্যন্ত এটি বন্ধ থাকবে।",
    },
  },
  {
    id: "2026-09-22-search-shows-every-match",
    date: "2026-09-22",
    // A storefront and API change: the dashboard version that is live, per the rule above.
    version: "4.12.5",
    tag: "fixed",
    title: {
      en: "Search can reach every matching product",
      bn: "সার্চে এখন সব পণ্যেই পৌঁছানো যায়",
    },
    body: {
      en: "Search never showed more than ten products, and there was no way to reach the rest — so a shop with two hundred shirts answered a search for shirts with ten of them. It now shows a full page at a time with working previous and next buttons, and the number beside your search is the real number of matches.",
      bn: "সার্চে কখনোই দশটির বেশি পণ্য দেখাত না, আর বাকিগুলোয় যাওয়ার কোনো উপায়ও ছিল না—ফলে দুইশ শার্টের দোকানে “শার্ট” খুঁজলে মাত্র দশটি আসত। এখন একবারে পুরো এক পাতা দেখায়, আগের-পরের বোতামও কাজ করে। আর সার্চের পাশে যে সংখ্যাটি থাকে, সেটিই আসল মিলে যাওয়া পণ্যের সংখ্যা।",
    },
  },
  {
    id: "2026-09-22-cart-page-in-your-language",
    date: "2026-09-22",
    // A storefront change: the dashboard version that is live, per the rule above.
    version: "4.12.5",
    tag: "fixed",
    title: {
      en: "Your cart page speaks your shop's language",
      bn: "কার্ট পেজ এখন আপনার দোকানের ভাষায়",
    },
    body: {
      en: "On the cart page the column headings, the estimated total and the button to check out were written in English whichever language your shop runs in, and they now follow your shop. The line under the total was wrong as well: it promised that taxes and discounts would be worked out at checkout, and Paperbase handles neither. It now says what is true — the delivery charge is added at checkout.",
      bn: "কার্ট পেজে কলামের শিরোনাম, আনুমানিক মোট আর অর্ডারের বোতাম—আপনার দোকান যে ভাষাতেই চলুক, এগুলো ইংরেজিতেই দেখাত; এখন সেগুলো দোকানের ভাষা মেনে চলে। মোটের নিচের লাইনটিও ভুল ছিল: সেখানে লেখা ছিল ট্যাক্স ও ছাড় চেকআউটে হিসাব হবে, অথচ পেপারবেসে এর কোনোটিই নেই। এখন যা সত্যি তাই লেখা থাকে—ডেলিভারি চার্জ চেকআউটে যোগ হবে।",
    },
  },
  {
    id: "2026-09-22-popup-waits-its-turn",
    date: "2026-09-22",
    version: "4.12.5",
    tag: "fixed",
    title: {
      en: "Your pop-up waits its turn",
      bn: "আপনার পপ-আপ এখন অপেক্ষা করে",
    },
    body: {
      en: "Your promotional pop-up used to appear on top of whatever a shopper was already looking at, including the panel confirming what they had just added to their cart. It now waits until the screen is free, and it is not counted as shown until the shopper actually sees it.",
      bn: "আগে আপনার প্রচারের পপ-আপ ক্রেতার সামনে খোলা যেকোনো কিছুর ওপরেই চলে আসত—এমনকি কার্টে পণ্য যোগ হওয়ার বার্তার ওপরেও। এখন স্ক্রিন খালি হওয়া পর্যন্ত অপেক্ষা করে, আর ক্রেতা সত্যিই না দেখা পর্যন্ত সেটি দেখানো হয়েছে বলে ধরা হয় না।",
    },
  },
  {
    id: "2026-09-22-card-add-to-cart-counted",
    date: "2026-09-22",
    version: "4.12.5",
    tag: "fixed",
    title: {
      en: "Add to cart from a card is now counted",
      bn: "কার্ড থেকে কার্টে যোগ এখন হিসাবে আসে",
    },
    body: {
      en: "When a shopper added a product straight from a card instead of opening the product page, your reports did not count it. Those add to cart numbers were lower than they should have been, and are now correct. Expect the figure to rise.",
      bn: "ক্রেতা পণ্যের পেজে না গিয়ে সরাসরি কার্ড থেকে কার্টে যোগ করলে সেটি আপনার রিপোর্টে গণনা হতো না। কার্টে যোগের সংখ্যা তাই আসলের চেয়ে কম দেখাত, এখন তা ঠিক করা হয়েছে। সংখ্যাটি বাড়তে দেখলে অবাক হবেন না।",
    },
    href: "/analytics",
  },
  {
    id: "2026-09-22-every-page-keeps-something",
    date: "2026-09-22",
    version: "4.12.5",
    tag: "improved",
    title: {
      en: "A page can no longer be left empty",
      bn: "কোনো পেজ আর একদম ফাঁকা করা যাবে না",
    },
    body: {
      en: "In the theme editor, every page now keeps one part you cannot hide: the products on your home and category pages, the posts on your journal, the writing on a post. Everything else, banners included, is still yours to move or remove.",
      bn: "থিম এডিটরে এখন প্রতিটি পেজে একটি অংশ থাকবেই, যা লুকানো যাবে না—হোম আর ক্যাটাগরিতে পণ্য, জার্নালে পোস্ট, পোস্টে লেখা। ব্যানারসহ বাকি সবকিছু আগের মতোই সরানো বা বাদ দেওয়া যাবে।",
    },
    href: "/settings/customize",
  },
  {
    id: "2026-09-22-lighter-buy-buttons",
    date: "2026-09-22",
    version: "4.12.4",
    tag: "improved",
    title: {
      en: "Softer text on the buy buttons",
      bn: "কেনার বাটনের লেখা একটু হালকা",
    },
    body: {
      en: "Order now and Add to cart are set a little lighter on your product pages. Nothing moved and nothing changed about how they work; they simply sit more quietly next to your product name and price.",
      bn: "পণ্যের পেজে এখনই অর্ডার করুন আর কার্টে যোগ করুন লেখা দুটি একটু হালকা করা হয়েছে। কিছু সরেনি, কাজেও কোনো বদল নেই; শুধু পণ্যের নাম আর দামের পাশে আগের চেয়ে শান্ত দেখায়।",
    },
  },
  {
    id: "2026-09-22-banners-move-into-the-editor",
    date: "2026-09-22",
    version: "4.12.0",
    tag: "improved",
    title: {
      en: "Banners move into the design editor",
      bn: "ব্যানার এখন ডিজাইন এডিটরে",
    },
    body: {
      en: "Your banner pictures are now part of your design, so you add and change them in Settings → Customization while watching your store beside you. The Banners page has left Promotions, which keeps your pop-up and your notice bar. Pictures you have used before are offered again, so you never upload the same photo twice.",
      bn: "ব্যানারের ছবি এখন আপনার ডিজাইনের অংশ, তাই সেটিংস → কাস্টমাইজেশনে পাশে স্টোর দেখতে দেখতেই ছবি যোগ বা বদল করবেন। প্রোমোশন থেকে ব্যানার পেজটি সরানো হয়েছে, সেখানে পপ-আপ আর নোটিশ বার থাকছে। আগে ব্যবহার করা ছবিগুলো আবার দেখানো হয়, তাই একই ছবি দুবার আপলোড করতে হবে না।",
    },
    href: "/settings?tab=customization",
  },
  {
    id: "2026-09-22-every-plan-can-customize",
    date: "2026-09-22",
    version: "4.12.0",
    tag: "improved",
    title: {
      en: "Every plan can now customize its store",
      bn: "এখন সব প্ল্যানেই স্টোর সাজানো যাবে",
    },
    body: {
      en: "The design editor used to be Premium only. Now every store can open it and change the Basic design; Premium is what lets you pick a different theme. Each theme also keeps its own design, so looking at another one never costs you the work you have already done.",
      bn: "ডিজাইন এডিটর আগে শুধু প্রিমিয়ামে ছিল। এখন যেকোনো স্টোর এটি খুলে বেসিক ডিজাইন বদলাতে পারবে; অন্য থিম বেছে নিতে প্রিমিয়াম লাগবে। প্রতিটি থিমের ডিজাইন আলাদাভাবে জমা থাকে, তাই অন্য থিম দেখে এলে আগের কাজ হারাবে না।",
    },
    href: "/settings?tab=customization",
  },
  {
    id: "2026-09-22-team-screen-in-bangla",
    date: "2026-09-22",
    version: "4.12.0",
    tag: "improved",
    title: {
      en: "Team and roles, in your language",
      bn: "টিম আর রোল এখন আপনার ভাষায়",
    },
    body: {
      en: "The Team screen and the role editor were in English, so the list of what a role may do was hard to read. Every name and message there is now in Bangla as well. The permissions themselves have not changed.",
      bn: "টিম পেজ আর রোল এডিটর ইংরেজিতে ছিল, তাই কোন রোল কী কী করতে পারে তা পড়া কঠিন ছিল। সেখানকার সব নাম আর বার্তা এখন বাংলাতেও আছে। অনুমতিগুলোতে কোনো পরিবর্তন হয়নি।",
    },
    href: "/settings?tab=team",
  },
  {
    id: "2026-09-22-theme-editor-and-live-preview",
    date: "2026-09-22",
    version: "4.12.0",
    tag: "new",
    title: {
      en: "Choose a theme and design your store",
      bn: "থিম বেছে নিন, নিজের মতো স্টোর সাজান",
    },
    body: {
      en: "In Settings → Customization you can now pick a theme and open a full screen editor, where you change each page's text, links and parts while your store updates beside you. What you change stays a draft your shoppers can't see until you press Save to store, and your last twenty saves are kept so you can go back to an older look. Themes are part of the Premium plan.",
      bn: "সেটিংস → কাস্টমাইজেশন থেকে এখন একটি থিম বেছে নিয়ে পুরো স্ক্রিনের এডিটর খুলতে পারবেন, যেখানে প্রতিটি পেজের লেখা, লিংক আর অংশগুলো বদলাবেন আর পাশেই আপনার স্টোর বদলাতে দেখবেন। যা বদলান তা ড্রাফট হয়ে থাকে, ক্রেতারা দেখেন না; স্টোরে সংরক্ষণ বাটনে চাপলেই তা স্টোরে যায়, আর শেষ ২০টি সংরক্ষণ রাখা থাকে যাতে আগের চেহারায় ফিরতে পারেন। থিম প্রিমিয়াম প্ল্যানের অংশ।",
    },
    href: "/settings?tab=customization",
  },
  {
    id: "2026-09-22-managers-can-edit-storefront-look",
    date: "2026-09-22",
    version: "4.8.5",
    tag: "improved",
    title: {
      en: "Managers can now change your storefront's look",
      bn: "ম্যানেজাররা এখন স্টোরফ্রন্টের ডিজাইন বদলাতে পারবেন",
    },
    body: {
      en: "Team members with the Manager role can now edit Settings → Customization, like the owner and Admins. Staff and Viewers can't, even if the permission is ticked for their role, and a team member limited to some categories can't either.",
      bn: "ম্যানেজার রোলের টিম মেম্বাররা এখন মালিক ও অ্যাডমিনের মতো সেটিংস → কাস্টমাইজেশন বদলাতে পারবেন। স্টাফ ও ভিউয়াররা পারবেন না, তাদের রোলে পারমিশন টিক দেওয়া থাকলেও না, আর কিছু ক্যাটাগরিতে সীমিত টিম মেম্বাররাও পারবেন না।",
    },
    href: "/settings?tab=customization",
  },
  {
    id: "2026-09-22-purchases-count-at-order-time",
    date: "2026-09-22",
    version: "4.8.4",
    tag: "improved",
    title: {
      en: "Purchases now count when the order is placed",
      bn: "অর্ডার করার সাথে সাথেই পারচেজ গণনা হবে",
    },
    body: {
      en: "Facebook and TikTok now count a cash on delivery order as a purchase as soon as the customer places it, instead of waiting for you to confirm. Your purchase numbers will look higher, because orders that are cancelled later stay counted. Prepaid orders still count when the customer pays.",
      bn: "ক্যাশ অন ডেলিভারি অর্ডার এখন গ্রাহক অর্ডার করার সাথে সাথেই Facebook ও TikTok-এ পারচেজ হিসেবে গণনা হয়, আপনার কনফার্ম করার অপেক্ষা করে না। এতে পারচেজের সংখ্যা বেশি দেখাবে, কারণ পরে বাতিল হওয়া অর্ডারও গোনা থাকবে। প্রিপেইড অর্ডার আগের মতোই গ্রাহক পেমেন্ট করলে গণনা হবে।",
    },
  },
  {
    id: "2026-09-22-brief-glitch-no-longer-hides-a-product",
    date: "2026-09-22",
    version: "4.8.3",
    tag: "fixed",
    title: {
      en: "A brief glitch no longer hides a product",
      bn: "সাময়িক সমস্যায় পণ্য আর হারিয়ে যাবে না",
    },
    body: {
      en: "If our servers hiccup while a product page is being prepared, your shop no longer shows \"product not found\" for the next few minutes. Products that really are gone still show a proper not-found page.",
      bn: "পণ্যের পেজ তৈরির সময় আমাদের সার্ভারে সাময়িক সমস্যা হলে আপনার দোকান এখন আর কয়েক মিনিট ধরে \"পণ্য পাওয়া যায়নি\" দেখাবে না। সত্যিই মুছে ফেলা পণ্যের জন্য আগের মতোই সঠিক বার্তা দেখাবে।",
    },
  },
  {
    id: "2026-09-22-blog-posts-open-again",
    date: "2026-09-22",
    version: "4.8.2",
    tag: "fixed",
    title: {
      en: "Blog posts open again",
      bn: "ব্লগ পোস্ট আবার খুলছে",
    },
    body: {
      en: "Opening a blog post on your storefront showed an error page instead of the article. Posts now open normally, and their text is cleaned on our servers so unsafe content never reaches shoppers.",
      bn: "আপনার স্টোরফ্রন্টে ব্লগ পোস্ট খুললে আর্টিকেলের বদলে এরর পেজ আসত। এখন পোস্টগুলো ঠিকভাবে খোলে, আর পোস্টের লেখা আমাদের সার্ভারেই পরিষ্কার করা হয়, তাই ক্ষতিকর কিছু ক্রেতাদের কাছে পৌঁছায় না।",
    },
    href: "/blog",
  },
  {
    id: "2026-09-22-faster-storefront",
    date: "2026-09-22",
    version: "4.8.1",
    tag: "improved",
    title: {
      en: "Faster storefront and a lighter home page",
      bn: "দোকান এখন দ্রুত, হোম পেজ হালকা",
    },
    body: {
      en: "Your shop pages load faster and no longer jump about while loading. The home page now shows your first 6 categories with 8 products each, and shoppers reach the rest from the menu. Price and stock changes also appear sooner.",
      bn: "আপনার দোকানের পেজগুলো এখন দ্রুত লোড হয় আর লোড হওয়ার সময় আগের মতো লাফায় না। হোম পেজে এখন প্রথম ৬টি ক্যাটাগরি দেখাবে, প্রতিটিতে ৮টি পণ্য, বাকিগুলো ক্রেতারা মেনু থেকে দেখতে পাবেন। দাম বা স্টক বদলালে সেটাও এখন আগের চেয়ে তাড়াতাড়ি দেখা যায়।",
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
];
