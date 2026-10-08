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
 * ## The cap, while NOTHING in this list has shipped
 *
 * "Delete the oldest" assumes the oldest has been seen. Every entry here is
 * held behind the theme system, so deleting one deletes an announcement nobody
 * has read — the checkout's entry on 2026-09-24 was the first addition to hit
 * the cap that way. What that one did instead: it MERGED the two cart entries,
 * which were one feature told twice. Do that, or drop a released entry; never
 * drop a held one to make room. (The search page's entry, the same day, merged
 * the checkout's two -- its page and the form that moved onto it -- and the
 * blog's merged the corners and the card style, both the Style panel -- and
 * the footer's merged the home page's two band entries -- and a blog post's
 * was folded into the blog page's, one feature told once -- and the rest of the
 * home page into the home page's rows, and the header into the footer's -- and
 * the order list's "Payment submitted" merged the two review entries -- and
 * the product page's fold-out rows took in the delivery terms' entry, whose
 * strip they replaced -- and the Integrations cards merged the two entries
 * about pictures in Customization, the pictures given back and the ones that
 * had stopped loading -- and the six palettes took in the corners-and-cards
 * entry: the three choices of one Style panel, told once.)
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
 * **SHIPPED 2026-09-26 in dash 4.118.9, without the restamp** -- it was missed on the
 * day, and a shipped id is never renamed, so that batch keeps `2026-09-22`. Every
 * entry after it carries the day it reaches merchants, like any other.
 *
 * How to tell them apart: production has had nothing newer than **4.7.1**, so any
 * entry above that version is held. As of 2026-09-22 that is the WHOLE list —
 * every released entry has now aged off the 30-entry cap, the last of them
 * (`2026-09-15-whats-new-panel`) when customer reviews were added. So on
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
    id: "2026-10-10-getting-ready-for-paperbase-accounts",
    date: "2026-10-10",
    version: "4.184.4",
    tag: "improved",
    title: {
      en: "Getting ready for Paperbase accounts",
      bn: "Paperbase অ্যাকাউন্টের প্রস্তুতি",
    },
    body: {
      en: "We added a small file that will let the coming Paperbase accounts sign-in page use the passkeys you already have. Nothing changes for you yet: you sign in as before.",
      bn: "আসন্ন Paperbase অ্যাকাউন্টের সাইন-ইন পাতা যেন আপনার আগের পাসকি দিয়েই কাজ করে, সেজন্য একটি ছোট ফাইল যোগ করা হয়েছে। আপনার জন্য এখনই কিছু বদলাচ্ছে না: আগের মতোই সাইন ইন করবেন।",
    },
  },
  {
    id: "2026-10-08-security-updates",
    date: "2026-10-08",
    version: "4.184.1",
    tag: "fixed",
    title: {
      en: "Security updates for the dashboard",
      bn: "ড্যাশবোর্ডে নিরাপত্তা আপডেট",
    },
    body: {
      en: "We updated the parts the dashboard is built on, closing known security issues. Nothing changes in how you use it.",
      bn: "ড্যাশবোর্ড যেসব অংশ দিয়ে তৈরি, সেগুলো আপডেট করে জানা নিরাপত্তা সমস্যাগুলো বন্ধ করা হয়েছে। আপনার ব্যবহারে কিছুই বদলাবে না।",
    },
  },
  {
    id: "2026-10-07-faster-passkey-sign-in",
    date: "2026-10-07",
    version: "4.184.0",
    tag: "improved",
    title: {
      en: "Faster passkey sign-in",
      bn: "পাসকি দিয়ে আরও দ্রুত সাইন ইন",
    },
    body: {
      en: "Tap the email box on the sign-in page and your phone or computer now offers your passkey: one tap, then Face ID or your fingerprint, and you are in. Settings > Account > Passkeys also says where each passkey is saved, like Apple Passwords or Google Password Manager.",
      bn: "সাইন-ইন পেজে ইমেইলের ঘরে ট্যাপ করলে আপনার ফোন বা কম্পিউটার এখন নিজেই আপনার পাসকি দেখায়: একবার ট্যাপ, তারপর Face ID বা আঙুলের ছাপ দিলেই সাইন ইন। সেটিংস > অ্যাকাউন্ট > পাসকি-তে এখন এটাও দেখা যায় প্রতিটি পাসকি কোথায় রাখা, যেমন Apple Passwords বা Google Password Manager।",
    },
    href: "/settings?tab=account",
  },
  {
    id: "2026-10-07-new-icons-in-the-menus",
    date: "2026-10-07",
    version: "4.183.0",
    tag: "improved",
    title: {
      en: "New icons in the menus",
      bn: "মেনুতে নতুন আইকন",
    },
    body: {
      en: "The main menu and the Settings menu now share one set of clean, outlined icons, so the two look alike.",
      bn: "মূল মেনু আর সেটিংস মেনু এখন একই ধরনের পরিষ্কার, রেখায় আঁকা আইকন ব্যবহার করে, তাই দুটো দেখতে একরকম।",
    },
  },
  {
    id: "2026-10-07-a-cleaner-account-menu",
    date: "2026-10-07",
    version: "4.181.0",
    tag: "improved",
    title: {
      en: "A cleaner account menu",
      bn: "আরও পরিচ্ছন্ন অ্যাকাউন্ট মেনু",
    },
    body: {
      en: "The menu under your name is now shorter: theme and language are small switches, and What's new tells you how many updates are waiting.",
      bn: "আপনার নামের নিচের মেনু এখন আরও ছোট: থিম আর ভাষা ছোট সুইচে, আর নতুন কী আছে জানায় কতগুলো আপডেট দেখা বাকি।",
    },
  },
  {
    id: "2026-10-07-view-my-shop-in-the-sidebar",
    date: "2026-10-07",
    version: "4.180.1",
    tag: "improved",
    title: {
      en: "View your shop and Settings, one click away",
      bn: "এক ক্লিকে আপনার দোকান আর সেটিংস",
    },
    body: {
      en: "At the bottom of the menu there's now \"View my shop\", which opens your live shop in a new tab, and \"Settings\", which used to be inside your account menu. \"Copy store id\" is gone from that menu, as nothing needs it any more.",
      bn: "মেনুর নিচে এখন আছে \"আমার দোকান দেখুন\", যা নতুন ট্যাবে আপনার লাইভ দোকান খোলে, আর \"সেটিংস\", যা আগে আপনার অ্যাকাউন্ট মেনুর ভেতরে ছিল। ওই মেনু থেকে \"স্টোর আইডি কপি করুন\" সরানো হয়েছে, কারণ এটি আর কোথাও লাগে না।",
    },
  },
  {
    id: "2026-10-05-faster-facebook-tracking",
    date: "2026-10-05",
    version: "4.179.3",
    tag: "fixed",
    title: {
      en: "Facebook ad tracking is faster and more complete",
      bn: "ফেসবুক বিজ্ঞাপনের ট্র্যাকিং এখন দ্রুত ও পূর্ণাঙ্গ",
    },
    body: {
      en: "Your shop's Facebook pixel now sends its events straight away. Before, some reached Facebook about 5 seconds late and were lost when a shopper left quickly. TikTok's event log also now shows a send TikTok refused as failed, not as sent.",
      bn: "আপনার দোকানের ফেসবুক পিক্সেল এখন সঙ্গে সঙ্গে ইভেন্ট পাঠায়। আগে কিছু ইভেন্ট প্রায় ৫ সেকেন্ড দেরিতে ফেসবুকে পৌঁছাত, আর ক্রেতা তাড়াতাড়ি চলে গেলে হারিয়ে যেত। টিকটক কোনো ইভেন্ট ফিরিয়ে দিলে ইভেন্ট লগে এখন সেটি পাঠানো নয়, ব্যর্থ হিসেবে দেখায়।",
    },
    href: "/settings?tab=integrations",
  },
  {
    id: "2026-10-05-shop-not-found-page",
    date: "2026-10-05",
    version: "4.179.2",
    tag: "new",
    title: {
      en: "A friendly page for wrong addresses",
      bn: "ভুল ঠিকানায় এখন সুন্দর একটি পেজ",
    },
    body: {
      en: "When a shopper opens an address your shop has nothing at, like an old link, a removed product or a typo, they now see your shop with its menu, in your colours, with buttons back to your home page and all products, instead of a blank \"Not Found\".",
      bn: "ক্রেতা আপনার দোকানের এমন কোনো ঠিকানায় গেলে যেখানে কিছু নেই, যেমন পুরোনো লিংক, সরিয়ে ফেলা পণ্য বা টাইপের ভুল, এখন ফাঁকা \"Not Found\"-এর বদলে আপনার দোকানটিই দেখবেন: মেনুসহ, আপনার রঙে, আর হোম পেজ ও সব পণ্যে ফেরার বোতাম।",
    },
  },
  {
    id: "2026-10-05-web-address-in-dynamic-fields",
    date: "2026-10-05",
    version: "4.179.1",
    tag: "fixed",
    title: {
      en: "One name for web addresses",
      bn: "ওয়েব ঠিকানার এক নাম",
    },
    body: {
      en: "In Settings > Dynamic fields, the product's address is now called \"Web address\", the same as on the product form, instead of \"Slug\".",
      bn: "সেটিংস > ডায়নামিক ফিল্ডে পণ্যের ঠিকানা এখন \"স্লাগ\"-এর বদলে \"ওয়েব ঠিকানা\" নামে দেখায়, পণ্যের ফর্মের মতোই।",
    },
    href: "/settings?tab=eav",
  },
  {
    id: "2026-10-05-readable-addresses-brands-and-posts",
    date: "2026-10-05",
    version: "4.179.0",
    tag: "improved",
    title: {
      en: "Readable web addresses for brands and blog posts",
      bn: "ব্র্যান্ড আর ব্লগ পোস্টেও পড়ার মতো ওয়েব ঠিকানা",
    },
    body: {
      en: "Brands and blog posts with Bangla names now get addresses in English letters too, like /blog/sharir-jotn, instead of post-2 or a code. Renaming keeps the address, you can change it yourself, and every old link keeps working.",
      bn: "বাংলা নামের ব্র্যান্ড আর ব্লগ পোস্টও এখন post-2 বা কোডের বদলে ইংরেজি অক্ষরে ঠিকানা পায়, যেমন /blog/sharir-jotn। নাম বদলালেও ঠিকানা একই থাকে, চাইলে নিজে বদলাতে পারেন, আর পুরোনো সব লিংক কাজ করে।",
    },
    href: "/blog",
  },
  {
    id: "2026-10-05-readable-web-addresses",
    date: "2026-10-05",
    version: "4.178.0",
    tag: "improved",
    title: {
      en: "Readable web addresses for Bangla names",
      bn: "বাংলা নামেও পড়ার মতো ওয়েব ঠিকানা",
    },
    body: {
      en: "A product or category with a Bangla name now gets an address in English letters, like holud-suti-thri-pis, instead of a long code. Renaming keeps the address, you can change it yourself, and every old link keeps working.",
      bn: "বাংলা নামের পণ্য বা ক্যাটাগরি এখন লম্বা কোডের বদলে ইংরেজি অক্ষরে ঠিকানা পায়, যেমন holud-suti-thri-pis। নাম বদলালেও ঠিকানা একই থাকে, চাইলে নিজে বদলাতে পারেন, আর পুরোনো সব লিংক কাজ করে।",
    },
    href: "/products",
  },
  {
    id: "2026-10-04-dashboard-in-bangla-everywhere",
    date: "2026-10-04",
    version: "4.177.0",
    tag: "improved",
    title: {
      en: "The dashboard speaks your language everywhere",
      bn: "পুরো ড্যাশবোর্ড এখন আপনার ভাষায়",
    },
    body: {
      en: "Words still in English on the orders list, an order's page, Settings (checkout, autopilot, passkeys, security, pop-ups), the blog and picture uploads now follow your language. When the internet drops, the message says so in your language too.",
      bn: "অর্ডারের তালিকা, অর্ডারের পাতা, সেটিংস (চেকআউট, অটোপাইলট, পাসকি, নিরাপত্তা, পপ-আপ), ব্লগ আর ছবি আপলোডে যেসব লেখা এখনো ইংরেজিতে ছিল, সেগুলো এখন আপনার ভাষায়। ইন্টারনেট চলে গেলে সেই বার্তাও এখন আপনার ভাষায় দেখায়।",
    },
  },
  {
    id: "2026-10-04-security-updates",
    date: "2026-10-04",
    version: "4.176.4",
    tag: "fixed",
    title: {
      en: "Security updates for the dashboard",
      bn: "ড্যাশবোর্ডে নিরাপত্তা আপডেট",
    },
    body: {
      en: "We updated the parts the dashboard is built on, closing known security issues. Nothing changes in how you use it.",
      bn: "ড্যাশবোর্ড যেসব অংশ দিয়ে তৈরি, সেগুলো আপডেট করে জানা নিরাপত্তা সমস্যাগুলো বন্ধ করা হয়েছে। আপনার ব্যবহারে কিছুই বদলাবে না।",
    },
  },
  {
    id: "2026-10-04-cards-that-follow-the-photo",
    date: "2026-10-04",
    version: "4.176.0",
    tag: "new",
    title: {
      en: "Product cards that follow the photo",
      bn: "ছবির মাপে প্রোডাক্ট কার্ড",
    },
    body: {
      en: "Tick a main category in Customize, under Card photos, and its cards take each photo's own shape: no blank sides, nothing cut. The categories under it follow, and so does a home page row of it. Everywhere else, cards stay square.",
      bn: "কাস্টমাইজে \"কার্ডের ছবি\" থেকে কোনো মূল ক্যাটাগরিতে টিক দিন, তার কার্ডগুলো প্রতিটি ছবির নিজের মাপ নেবে: পাশে ফাঁকা থাকবে না, কিছু কাটাও পড়বে না। এর ভেতরের ক্যাটাগরি আর হোম পেজে এর সারিও তাই করবে। বাকি সব জায়গায় কার্ড চৌকোই থাকে।",
    },
    href: "/settings/customize",
  },
  {
    id: "2026-10-04-buying-area-whatsapp-quantity-share",
    date: "2026-10-04",
    version: "4.175.0",
    tag: "new",
    title: {
      en: "Quantity, WhatsApp orders and Share on product pages",
      bn: "পণ্যের পাতায় পরিমাণ, WhatsApp-এ অর্ডার আর শেয়ার",
    },
    body: {
      en: "Shoppers can pick a quantity, never more than you have, and order on WhatsApp with their choice already typed. Pressed before a size is chosen, the buttons show which choice is missing, and Share now works on computers too. Turn each part on or off in Customize, under Buying area.",
      bn: "ক্রেতা এখন পরিমাণ বেছে নিতে পারেন, আপনার স্টকের বেশি নয়, আর পছন্দ আগেই লেখা অবস্থায় WhatsApp-এ অর্ডার করতে পারেন। সাইজ না বেছে বোতাম চাপলে দেখায় কোনটি বাছতে হবে, আর শেয়ার এখন কম্পিউটারেও কাজ করে। কাস্টমাইজে \"কেনার অংশ\" থেকে প্রতিটি চালু বা বন্ধ করুন।",
    },
    href: "/settings/customize",
  },
  {
    id: "2026-10-04-questions-beside-the-buy-button",
    date: "2026-10-04",
    version: "4.174.0",
    tag: "improved",
    title: {
      en: "Product questions beside the buy button",
      bn: "পণ্যের প্রশ্ন এখন কেনার বোতামের পাশে",
    },
    body: {
      en: "The questions you write on a product now sit right under its buy button, in one \"Questions\" row that opens onto them all. Reviews now come before \"You may also like\". In Customize, Questions is on by default.",
      bn: "পণ্যে লেখা প্রশ্নগুলো এখন কেনার বোতামের ঠিক নিচে, একটি \"প্রশ্ন ও উত্তর\" সারিতে, খুললে সব দেখা যায়। রিভিউ এখন \"এগুলোও দেখতে পারেন\"-এর আগে আসে। কাস্টমাইজে প্রশ্ন শুরু থেকেই চালু।",
    },
    href: "/settings/customize",
  },
  {
    id: "2026-10-04-editor-product-photos-alone",
    date: "2026-10-04",
    version: "4.173.4",
    tag: "fixed",
    title: {
      en: "Picking the product photos picks just the photos",
      bn: "পণ্যের ছবি বাছলে এখন শুধু ছবিই বাছা হয়",
    },
    body: {
      en: "In Customize, on the product page, clicking the photos now outlines only the photos, and the place is called Product photos. Clicking the name or price beside them opens Product details.",
      bn: "কাস্টমাইজে, পণ্যের পেজে ছবিতে ক্লিক করলে এখন শুধু ছবির চারপাশেই দাগ পড়ে, আর জায়গাটির নাম পণ্যের ছবি। পাশে নাম বা দামে ক্লিক করলে পণ্যের বিস্তারিত খোলে।",
    },
    href: "/settings/customize",
  },
  {
    id: "2026-10-04-product-photos-whole-and-at-once",
    date: "2026-10-04",
    version: "4.173.3",
    tag: "fixed",
    title: {
      en: "Product photos show whole, and at once",
      bn: "পণ্যের ছবি এখন পুরোটা দেখা যায়, সাথে সাথেই",
    },
    body: {
      en: "Product photos now show whole instead of zoomed in: when you add or edit a product, and in the Products grid. And a photo you add or change shows on the product the moment you save, instead of minutes later.",
      bn: "পণ্যের ছবি এখন বড় করে কাটা না হয়ে পুরোটা দেখা যায়: পণ্য যোগ বা এডিট করার সময়, আর পণ্যের গ্রিডেও। আর যে ছবি যোগ বা বদল করেন, তা সেভ করার সাথে সাথেই পণ্যে দেখা যায়, কয়েক মিনিট পরে নয়।",
    },
    href: "/products",
  },
  {
    id: "2026-10-04-cleaner-page-tops-and-analytics-days",
    date: "2026-10-04",
    version: "4.173.1",
    tag: "improved",
    title: {
      en: "Cleaner page tops, and Analytics days in the filter",
      bn: "আরও পরিষ্কার পেজের ওপরের অংশ, আর অ্যানালিটিক্সের দিনগুলো ফিল্টারে",
    },
    body: {
      en: "Pages no longer show a back arrow. On Analytics, the days you look at (Today, 7 days, This month, Custom...) are now inside the filter button, and the comparison and Download are small icons beside it: point at one to see its name.",
      bn: "পেজগুলোতে আর পেছনে যাওয়ার তীর দেখা যায় না। অ্যানালিটিক্সে কোন দিনগুলো দেখবেন (আজ, ৭ দিন, এই মাস, নিজে বাছুন...) তা এখন ফিল্টার বাটনের ভেতরে, আর তুলনা ও ডাউনলোড এর পাশে ছোট আইকন: নাম দেখতে এর ওপর মাউস রাখুন।",
    },
    href: "/analytics",
  },
  {
    id: "2026-10-04-a-friendlier-empty-trash",
    date: "2026-10-04",
    version: "4.172.2",
    tag: "improved",
    title: {
      en: "A friendlier empty Trash",
      bn: "ফাঁকা ট্র্যাশ এখন আরও সুন্দর",
    },
    body: {
      en: "An empty Trash now shows a little bin whose lid lifts when you touch it, and says what it is for: what you delete waits there for 15 days, so you can bring it back.",
      bn: "ফাঁকা ট্র্যাশে এখন একটি ছোট বিন দেখা যায়, ছুঁলেই যার ঢাকনা খুলে যায়, আর বলে এটি কিসের জন্য: যা মুছে ফেলেন তা ১৫ দিন সেখানে থাকে, যাতে ফিরিয়ে আনতে পারেন।",
    },
    href: "/trash",
  },
  {
    id: "2026-10-04-tidier-page-headers",
    date: "2026-10-04",
    version: "4.172.0",
    tag: "improved",
    title: {
      en: "Tidier pages, with a ? beside each title",
      bn: "আরও গোছানো পেজ, প্রতিটি শিরোনামের পাশে একটি ?",
    },
    body: {
      en: "Every page now has a small ? beside its title: point at it or tap it to see what the page is for. Filters stay inside the filter button until you open them, and a dot on it shows when one is on.",
      bn: "এখন প্রতিটি পেজের শিরোনামের পাশে একটি ছোট ? আছে: পেজটি কিসের জন্য তা দেখতে এর ওপর মাউস রাখুন বা ট্যাপ করুন। ফিল্টারগুলো ফিল্টার বাটনের ভেতরেই থাকে, আর কোনো ফিল্টার চালু থাকলে বাটনে একটি বিন্দু দেখা যায়।",
    },
    href: "/orders",
  },
  {
    id: "2026-10-04-analytics-is-part-of-premium",
    date: "2026-10-04",
    version: "4.171.0",
    tag: "improved",
    title: {
      en: "Analytics is part of Premium",
      bn: "অ্যানালিটিক্স এখন প্রিমিয়ামের অংশ",
    },
    body: {
      en: "Analytics, with your sales, visitors, best sellers and more, is now on the Premium plan. On Essential, opening Analytics takes you to the plans, and a gold star marks it in Settings, Apps.",
      bn: "অ্যানালিটিক্স, মানে আপনার বিক্রি, ভিজিটর, সবচেয়ে বিক্রি হওয়া পণ্য আর আরও অনেক কিছু, এখন প্রিমিয়াম প্ল্যানে। এসেনশিয়ালে অ্যানালিটিক্স খুললে প্ল্যান পেজে নিয়ে যায়, আর সেটিংসের অ্যাপে এর পাশে একটি সোনালি তারা থাকে।",
    },
    href: "/plans",
  },
  {
    id: "2026-10-04-a-shorter-bkash-step-in-bangla",
    date: "2026-10-04",
    version: "4.169.1",
    tag: "improved",
    title: {
      en: "A shorter bKash step in Bangla",
      bn: "বাংলায় বিকাশের ধাপ এখন আরও ছোট",
    },
    body: {
      en: "On the payment page, the Bangla bKash instruction is now shorter and reads just like Nagad's.",
      bn: "পেমেন্ট পেজে বাংলায় বিকাশের নির্দেশনা এখন আরও ছোট, নগদের নির্দেশনার মতোই।",
    },
    href: "/plans",
  },
  {
    id: "2026-10-04-add-new-from-the-sidebar",
    date: "2026-10-04",
    version: "4.169.0",
    tag: "new",
    title: {
      en: "Add new, from the sidebar",
      bn: "সাইডবার থেকেই নতুন যোগ করুন",
    },
    body: {
      en: "An Add new button in the sidebar opens a quick menu: a new order, product, category, discount code, blog post or review, from any page. It shows only what your role can add.",
      bn: "সাইডবারের নতুন যোগ করুন বাটনে একটি ছোট মেনু খোলে: যেকোনো পেজ থেকে নতুন অর্ডার, পণ্য, ক্যাটাগরি, ডিসকাউন্ট কোড, ব্লগ পোস্ট বা রিভিউ। আপনার রোল যা যোগ করতে পারে, শুধু সেগুলোই দেখায়।",
    },
  },
  {
    id: "2026-10-04-a-friendlier-empty-blog-and-reviews",
    date: "2026-10-04",
    version: "4.168.0",
    tag: "improved",
    title: {
      en: "A friendlier empty Blog and Reviews",
      bn: "ফাঁকা ব্লগ ও রিভিউ এখন আরও সুন্দর",
    },
    body: {
      en: "With no posts or reviews yet, Blog and Reviews now show a little folder that opens when you touch it, with one button to write your first post or add a review. On Customers and Accounts, the filter button now sits on the right, like every other list.",
      bn: "এখনও কোনো পোস্ট বা রিভিউ না থাকলে ব্লগ ও রিভিউ পেজে এখন ছোট একটি ফোল্ডার দেখা যায়, ছুঁলেই খুলে যায়, আর সাথে থাকে প্রথম পোস্ট লেখা বা রিভিউ যোগ করার একটি বাটন। কাস্টমার ও অ্যাকাউন্ট পেজে ফিল্টার বাটন এখন অন্য সব তালিকার মতো ডান দিকে।",
    },
    href: "/blog",
  },
  {
    id: "2026-10-04-the-payment-page-in-bangla",
    date: "2026-10-04",
    version: "4.167.0",
    tag: "new",
    title: {
      en: "The payment page in Bangla",
      bn: "পেমেন্ট পেজ এখন বাংলায়",
    },
    body: {
      en: "When you pay for your plan, the payment page now opens in Bangla, so the bKash and Nagad steps are easy to follow. Prefer English? Tap English at the top; this device remembers it, and your dashboard keeps its own language.",
      bn: "প্ল্যানের টাকা দেওয়ার সময় পেমেন্ট পেজ এখন বাংলায় খোলে, যাতে বিকাশ ও নগদের ধাপগুলো সহজে বোঝা যায়। ইংরেজিতে দেখতে চান? উপরের English চাপুন; এই ডিভাইস সেটা মনে রাখবে, আর আপনার ড্যাশবোর্ড নিজের ভাষাতেই থাকবে।",
    },
    href: "/plans",
  },
  {
    id: "2026-10-04-clear-bkash-and-nagad-logos",
    date: "2026-10-04",
    version: "4.166.1",
    tag: "fixed",
    title: {
      en: "Clear bKash and Nagad logos",
      bn: "বিকাশ ও নগদের লোগো এখন পরিষ্কার",
    },
    body: {
      en: "On the payment page, bKash's logo lost its letters on the dark theme. Both logos now read clearly on light and dark, and are drawn larger.",
      bn: "পেমেন্ট পেজে ডার্ক থিমে বিকাশের লোগোর লেখা দেখা যাচ্ছিল না। এখন লাইট ও ডার্ক দুই থিমেই দুটি লোগো পরিষ্কার দেখা যায়, আর আকারেও একটু বড়।",
    },
    href: "/plans",
  },
  {
    id: "2026-10-04-a-clear-page-when-payment-is-not-ready",
    date: "2026-10-04",
    version: "4.166.0",
    tag: "fixed",
    title: {
      en: "A clear page when payment isn't ready",
      bn: "পেমেন্ট তৈরি না থাকলে পরিষ্কার একটি পেজ",
    },
    body: {
      en: "If there's no bKash or Nagad number to pay your plan to yet, the payment page now says so plainly, instead of showing a form with no number.",
      bn: "প্ল্যানের টাকা পাঠানোর জন্য এখনো কোনো বিকাশ বা নগদ নম্বর না থাকলে, পেমেন্ট পেজ এখন নম্বর ছাড়া ফর্ম না দেখিয়ে সেটা সোজাসুজি জানায়।",
    },
    href: "/plans",
  },
  {
    id: "2026-10-04-a-new-plans-page",
    date: "2026-10-04",
    version: "4.165.0",
    tag: "improved",
    title: {
      en: "A new Plans page",
      bn: "নতুন প্ল্যান পেজ",
    },
    body: {
      en: "Each plan is a card with its price, who it is for and what you get, so you can see at a glance what Premium adds. Your plan shows until when it is active, and yearly prices show what you save.",
      bn: "প্রতিটি প্ল্যান এখন একটি কার্ড: দাম, কাদের জন্য আর কী কী পাবেন, তাই এক নজরেই দেখা যায় প্রিমিয়ামে বাড়তি কী আছে। আপনার প্ল্যান কবে পর্যন্ত চালু তা দেখায়, আর বার্ষিক দামে দেখায় কত সাশ্রয় হয়।",
    },
    href: "/plans",
  },
  {
    id: "2026-10-04-a-clearer-look-at-premium-analytics",
    date: "2026-10-04",
    version: "4.163.1",
    tag: "improved",
    title: {
      en: "A clearer look at Premium analytics",
      bn: "প্রিমিয়াম অ্যানালিটিক্স এখন আরও পরিষ্কারভাবে দেখা যায়",
    },
    body: {
      en: "On the Essential plan, each Premium part of Analytics now shows its real layout, blurred, with a short note on what it tells you and a button to upgrade. Overview and Sales stay on your plan.",
      bn: "এসেনশিয়াল প্ল্যানে অ্যানালিটিক্সের প্রতিটি প্রিমিয়াম অংশ এখন তার আসল নকশা ঝাপসা করে দেখায়, সাথে থাকে সেটি কী জানায় তার ছোট একটি লেখা আর আপগ্রেড করার বোতাম। সারসংক্ষেপ আর বিক্রি আপনার প্ল্যানেই থাকছে।",
    },
    href: "/analytics",
  },
];
