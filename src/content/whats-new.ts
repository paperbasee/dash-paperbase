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
  {
    id: "2026-10-04-category-limits-hold-everywhere",
    date: "2026-10-04",
    version: "4.162.0",
    tag: "improved",
    title: {
      en: "Category limits now hold everywhere",
      bn: "ক্যাটাগরি সীমা এখন সব জায়গায় কাজ করে",
    },
    body: {
      en: "A Staff member limited to some categories now sees only their categories' numbers on the home page too, and the order list shows each order's full item count. On an order with items from other categories, they can work on the whole order but change only their own items.",
      bn: "কিছু ক্যাটাগরিতে সীমিত কোনো স্টাফ এখন হোম পেজেও শুধু তাঁর ক্যাটাগরির সংখ্যা দেখেন, আর অর্ডার তালিকায় প্রতিটি অর্ডারের পুরো আইটেম সংখ্যা দেখায়। অন্য ক্যাটাগরির আইটেমসহ কোনো অর্ডারে তিনি পুরো অর্ডার নিয়ে কাজ করতে পারেন, কিন্তু বদলাতে পারেন শুধু নিজের আইটেমগুলো।",
    },
    href: "/settings?tab=team",
  },
  {
    id: "2026-10-04-team-changes-take-effect-at-once",
    date: "2026-10-04",
    version: "4.161.0",
    tag: "improved",
    title: {
      en: "Team changes take effect at once",
      bn: "টিমের পরিবর্তন এখন সঙ্গে সঙ্গে কাজ করে",
    },
    body: {
      en: "When you change a team member's role or categories, or suspend or remove them, they're signed out of your shop right away on every device. They sign in again and see exactly what their new access allows. Ending a sign-in from Sessions now works at once too.",
      bn: "কোনো টিম মেম্বারের রোল বা ক্যাটাগরি বদলালে, অথবা তাঁকে স্থগিত বা সরিয়ে দিলে, সব ডিভাইসে তিনি সঙ্গে সঙ্গে আপনার শপ থেকে সাইন আউট হয়ে যান। আবার সাইন ইন করলে তাঁর নতুন অ্যাক্সেস অনুযায়ী ঠিক ততটুকুই দেখবেন। সেশন থেকে কোনো সাইন-ইন শেষ করলেও এখন সঙ্গে সঙ্গে কাজ করে।",
    },
    href: "/settings?tab=team",
  },
  {
    id: "2026-10-04-new-team-members-give-their-full-name",
    date: "2026-10-04",
    version: "4.158.1",
    tag: "improved",
    title: {
      en: "New team members give their full name",
      bn: "টিমের নতুন সদস্যরা পুরো নাম দেন",
    },
    body: {
      en: "When someone joins your team from an invite, they now enter both a first and a last name, so your team list shows everyone's full name.",
      bn: "আমন্ত্রণ থেকে কেউ আপনার টিমে যোগ দিলে এখন তাকে নামের প্রথম ও শেষ অংশ দুটোই লিখতে হয়, তাই আপনার টিমের তালিকায় সবার পুরো নাম দেখা যায়।",
    },
    href: "/settings?tab=team",
  },
  {
    id: "2026-10-04-you-hear-when-someone-downloads-your-orders",
    date: "2026-10-04",
    version: "4.158.0",
    tag: "new",
    title: {
      en: "You hear when someone downloads your orders",
      bn: "কেউ আপনার অর্ডার ডাউনলোড করলে আপনি জানতে পারবেন",
    },
    body: {
      en: "Every download of your orders is now a line in Activities. When someone on your team downloads them, we also email you who it was and how many orders, since the file holds your shoppers' names, phone numbers and addresses. Your own downloads send no email.",
      bn: "আপনার অর্ডারের প্রতিটি ডাউনলোড এখন কার্যকলাপে একটি লাইন হিসেবে থাকে। টিমের কেউ অর্ডার ডাউনলোড করলে কে করেছেন আর কতগুলো অর্ডার, তা আমরা আপনাকে ইমেইলেও জানাই, কারণ ফাইলে আপনার ক্রেতাদের নাম, ফোন নম্বর আর ঠিকানা থাকে। আপনি নিজে ডাউনলোড করলে কোনো ইমেইল যায় না।",
    },
    href: "/activities",
  },
  {
    id: "2026-10-04-three-fixed-roles-admin-manager-staff",
    date: "2026-10-04",
    version: "4.157.0",
    tag: "new",
    title: {
      en: "Three fixed roles: Admin, Manager and Staff",
      bn: "তিনটি নির্দিষ্ট রোল: অ্যাডমিন, ম্যানেজার ও স্টাফ",
    },
    body: {
      en: "Everyone on your team now has one of three roles, and what each can do is the same in every shop: see it in Settings > Team > Roles. The Viewer role and edited roles are gone; anyone who had one is paused until you choose their role, in one click. Each role now sees only what it can change, so Managers no longer see the shop's settings, and only Staff can be limited to some categories.",
      bn: "আপনার টিমের সবার এখন তিনটি রোলের একটি থাকে, আর কোন রোল কী করতে পারে তা সব শপে একই: সেটিংস > টিম > রোলে দেখুন। ভিউয়ার রোল আর বদলানো রোলগুলো আর নেই; যাদের এমন রোল ছিল তারা থামানো থাকবেন যতক্ষণ না আপনি এক ক্লিকে তাদের রোল বেছে দেন। প্রতিটি রোল এখন শুধু সেটুকুই দেখে যা সে বদলাতে পারে, তাই ম্যানেজাররা আর শপের সেটিংস দেখেন না, আর শুধু স্টাফদেরই কিছু ক্যাটাগরিতে সীমিত রাখা যায়।",
    },
    href: "/settings?tab=team",
  },
  {
    id: "2026-10-04-a-slimmer-sidebar-scrollbar",
    date: "2026-10-04",
    version: "4.156.1",
    tag: "improved",
    title: {
      en: "A slimmer scrollbar in the sidebar",
      bn: "সাইডবারে আরও সরু স্ক্রলবার",
    },
    body: {
      en: "The scrollbar in the sidebar, in the main menu and in Settings, is now a thin line that stays out of the way.",
      bn: "সাইডবারের স্ক্রলবার, মূল মেনু আর সেটিংস দুই জায়গাতেই, এখন একটি সরু রেখা, যা চোখে লাগে না।",
    },
  },
  {
    id: "2026-10-04-payments-your-own-bkash-and-nagad-numbers",
    date: "2026-10-04",
    version: "4.156.0",
    tag: "new",
    title: {
      en: "Payments: your own bKash and Nagad numbers",
      bn: "পেমেন্ট: আপনার নিজের বিকাশ ও নগদ নম্বর",
    },
    body: {
      en: "Settings has a new Payments tab, for you alone as the shop's owner: set a bKash number and a Nagad number, each on its own. Shoppers paying before delivery see the number of the wallet they pick, and we email you whenever one changes. Domains, courier accounts and your team are now yours alone too: your team members don't see them.",
      bn: "সেটিংসে নতুন পেমেন্ট ট্যাব আছে, শুধু আপনার জন্য, দোকানের মালিক হিসেবে: আলাদা করে একটি বিকাশ নম্বর ও একটি নগদ নম্বর দিন। ডেলিভারির আগে টাকা দেওয়া ক্রেতারা যে ওয়ালেট বেছে নেন তার নম্বর দেখেন, আর কোনো নম্বর বদলালে আমরা আপনাকে ইমেইল করি। ডোমেইন, কুরিয়ার অ্যাকাউন্ট আর আপনার টিমও এখন শুধু আপনার: টিমের সদস্যরা এগুলো দেখেন না।",
    },
    href: "/settings?tab=payments",
  },
  {
    id: "2026-10-04-everyone-greeted-by-their-own-name",
    date: "2026-10-04",
    version: "4.155.1",
    tag: "fixed",
    title: {
      en: "Everyone is greeted by their own name",
      bn: "সবাইকে তাদের নিজের নামে শুভেচ্ছা",
    },
    body: {
      en: "The home page now says hello to each person by their first name. Before, your team members saw your name instead of theirs. \"Last updated\" now shows in Bangla too.",
      bn: "হোম পেজ এখন প্রত্যেককে তাদের নামের প্রথম অংশ দিয়ে শুভেচ্ছা জানায়। আগে আপনার টিমের সদস্যরা নিজেদের নামের বদলে আপনার নাম দেখতেন। \"সর্বশেষ আপডেট\" এখন বাংলাতেও দেখায়।",
    },
  },
  {
    id: "2026-10-04-a-welcoming-team-invite",
    date: "2026-10-04",
    version: "4.155.0",
    tag: "improved",
    title: {
      en: "A welcoming page for your team invites",
      bn: "টিমের আমন্ত্রণের জন্য নতুন পেজ",
    },
    body: {
      en: "When you invite someone to your team, the page they open now shows your shop's logo, who invited them and what their role can do. New members type their own name, so your team list shows names, not just emails.",
      bn: "আপনি টিমে কাউকে আমন্ত্রণ জানালে, তারা যে পেজটি খোলেন তাতে এখন আপনার দোকানের লোগো, কে আমন্ত্রণ জানিয়েছেন আর তাদের ভূমিকায় কী করা যায় তা দেখায়। নতুন সদস্যরা নিজের নাম লেখেন, তাই আপনার টিমের তালিকায় শুধু ইমেইল নয়, নামও দেখায়।",
    },
    href: "/settings?tab=team",
  },
  {
    id: "2026-10-01-status-notice",
    date: "2026-10-01",
    version: "4.154.0",
    tag: "new",
    title: {
      en: "Know when Paperbase has a problem",
      bn: "Paperbase-এ সমস্যা হলে জানতে পারবেন",
    },
    body: {
      en: "If part of Paperbase is having trouble, or maintenance is planned for the next day, a short notice now appears at the top of your dashboard. Tap Details for the full story on status.paperbase.me, or hide it.",
      bn: "Paperbase-এর কোনো অংশে সমস্যা হলে, বা পরের দিনের মধ্যে রক্ষণাবেক্ষণ থাকলে, এখন ড্যাশবোর্ডের উপরে একটি ছোট নোটিশ দেখাবে। পুরো খবরের জন্য status.paperbase.me-তে \"বিস্তারিত\" চাপুন, অথবা নোটিশটি লুকিয়ে রাখুন।",
    },
  },
];
