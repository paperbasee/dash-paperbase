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
    id: "2026-09-22-product-page-choices",
    date: "2026-09-22",
    version: "4.73.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your product pages",
      bn: "পণ্যের পেজ নিজের মতো সাজান",
    },
    body: {
      en: "Under Product in your editor, seven choices are real now: show the path back up or hide it, pick how the pictures look — a frame with thumbnails, a column, or just one — put the description in a box or under a heading, show specifications in two columns or folded away, and switch \"You may also like\" and product questions on or off. Reviews can now be the full band or just the score and how many, which is the shorter way to show you are trusted.",
      bn: "এডিটরের পণ্য অংশে সাতটি পছন্দ এখন সত্যিকারের: উপরে ফেরার পথ দেখাবেন কি না; ছবি কেমন দেখাবে — থাম্বনেইলসহ একটি ছবি, ছবির কলাম, নাকি শুধু একটি; বিবরণ বাক্সে নাকি শিরোনামের নিচে; স্পেসিফিকেশন দুই কলামে নাকি ভাঁজ করা; আর “এগুলোও ভালো লাগতে পারে” ও পণ্যের প্রশ্ন চালু নাকি বন্ধ। রিভিউ এখন পুরো ব্যান্ড হিসেবে, নয়তো শুধু স্কোর আর কতজন দিয়েছেন — অল্প জায়গায় ভরসার চিহ্ন।",
    },
  },
  {
    id: "2026-09-22-shoppers-can-filter",
    date: "2026-09-22",
    version: "4.71.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Let shoppers filter a category",
      bn: "ক্রেতারা ক্যাটাগরি ফিল্টার করতে পারবেন",
    },
    body: {
      en: "Under Category → Filters, pick a button that opens a panel over the page or a column down the side, and shoppers can narrow by price, brand and whatever your products vary by — size, colour, whatever you have set up. Only the values a category actually has are offered, so a filter never leads to an empty page.",
      bn: "ক্যাটাগরি → ফিল্টার অংশে পাতার উপরে খোলে এমন একটি বোতাম, নাকি পাশে এক কলাম — বেছে নিন। ক্রেতারা দাম, ব্র্যান্ড আর আপনার পণ্য যেসব দিকে আলাদা — সাইজ, রঙ, যা আপনি যোগ করেছেন — সব দিয়ে খুঁজে নিতে পারবেন। কোনো ক্যাটাগরিতে যা সত্যিই আছে কেবল সেগুলোই দেখানো হয়, তাই ফিল্টার করে কখনো ফাঁকা পাতা আসে না।",
    },
  },
  {
    id: "2026-09-22-load-more-button",
    date: "2026-09-22",
    version: "4.70.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "A Load more button for long categories",
      bn: "বড় ক্যাটাগরির জন্য “আরও দেখুন” বোতাম",
    },
    body: {
      en: "Under Category → Getting to the rest, you can now choose a Load more button instead of numbered pages: the next lot of products appears under the grid without the shopper leaving the page. Numbered pages are still there and still the easier ones to share and to find in search.",
      bn: "ক্যাটাগরি → বাকিগুলোতে যাওয়া অংশে এখন নম্বর দেওয়া পাতার বদলে “আরও দেখুন” বোতাম বেছে নিতে পারেন: ক্রেতা পাতা না ছেড়েই গ্রিডের নিচে পরের পণ্যগুলো দেখতে পান। নম্বর দেওয়া পাতা আগের মতোই আছে, আর লিংক শেয়ার করা বা সার্চে আসা তাতেই সহজ।",
    },
  },
  {
    id: "2026-09-22-shoppers-can-sort",
    date: "2026-09-22",
    version: "4.69.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Let shoppers sort a category",
      bn: "ক্রেতারা ক্যাটাগরি সাজাতে পারবেন",
    },
    body: {
      en: "Under Category in your editor, Sorting can now be a small menu on the right or a row of choices: your own order, newest, price up, price down and most popular. Leave it off and your categories stay exactly as they are — in the order you arranged them.",
      bn: "এডিটরের ক্যাটাগরি অংশে সাজানোর ক্রম এখন ডান পাশে ছোট মেনু বা পাশাপাশি কয়েকটি অপশন হিসেবে দেখানো যায়: আপনার নিজের ক্রম, নতুন আগে, দাম কম থেকে বেশি, বেশি থেকে কম আর সবচেয়ে জনপ্রিয়। বন্ধ রাখলে ক্যাটাগরি আপনার সাজানো ক্রমেই থাকবে।",
    },
  },
  {
    id: "2026-09-22-category-pages-are-yours",
    date: "2026-09-22",
    version: "4.68.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your category pages",
      bn: "ক্যাটাগরি পেজ নিজের মতো সাজান",
    },
    body: {
      en: "The Category page in your editor is real now: the path back up, three shapes for the name including over the category's own picture, how many products are in it, and two, three or four across. Big categories get numbered pages, so shoppers reach everything instead of the first 48 — and you can say what an empty category shows and add words under the grid.",
      bn: "এডিটরের ক্যাটাগরি পেজটি এখন সত্যিকারের: উপরে ফেরার পথ, নামের তিনটি চেহারা — ক্যাটাগরির নিজের ছবির উপরেও — ভেতরে কতগুলো পণ্য আছে, আর এক সারিতে দুই, তিন নাকি চারটি। বড় ক্যাটাগরিতে নম্বর দেওয়া পাতা আসে, ফলে ক্রেতারা প্রথম ৪৮টিতে আটকে না থেকে সবকিছুই দেখতে পান — খালি ক্যাটাগরিতে কী দেখানো হবে তাও বলে দিতে পারেন, আর গ্রিডের নিচে লেখা যোগ করতে পারেন।",
    },
  },
  {
    id: "2026-09-22-corners-are-yours",
    date: "2026-09-22",
    version: "4.67.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Choose your shop's corners",
      bn: "দোকানের কোণা নিজেই বেছে নিন",
    },
    body: {
      en: "Square, soft or rounded — one choice for everything your shop draws a box around: cards, buttons, boxes you type in, pictures. It sits in Customization under Style, next to your product cards, and reaches shoppers when you press Save to store. Your shop keeps the corners it has until you change them.",
      bn: "চোকো, হালকা গোল, নাকি গোল — দোকানে যেখানে যেখানে বাক্স আঁকা হয় সবখানে একই পছন্দ: কার্ড, বোতাম, লেখার ঘর, ছবি। এটি কাস্টমাইজেশনের স্টাইল অংশে, প্রোডাক্ট কার্ডের পাশেই, আর স্টোরে সংরক্ষণ চাপলেই ক্রেতাদের কাছে যাবে। নিজে না বদলানো পর্যন্ত দোকানের কোণা আগের মতোই থাকবে।",
    },
  },
  {
    id: "2026-09-22-card-style-in-the-editor",
    date: "2026-09-22",
    version: "4.65.0",
    tag: "improved",
    href: "/settings?tab=customization",
    title: {
      en: "Product cards move into the editor",
      bn: "প্রোডাক্ট কার্ড এখন এডিটরের ভেতরে",
    },
    body: {
      en: "Choosing Classic or Shelf was a control in Settings, and it changed your shop the moment you clicked it. It now sits with the rest of your look, in Customization under Style — you can see the other style on your own shop first, and it reaches shoppers when you press Save to store.",
      bn: "ক্ল্যাসিক না শেলফ — এই পছন্দটি সেটিংসে ছিল, আর চাপ দেওয়ামাত্রই দোকানে বদলে যেত। এখন এটি আপনার বাকি ডিজাইনের সাথেই আছে, কাস্টমাইজেশনের স্টাইল অংশে — অন্য স্টাইলটি আগে নিজের দোকানে দেখে নিতে পারবেন, আর স্টোরে সংরক্ষণ চাপলেই সেটি ক্রেতাদের কাছে যাবে।",
    },
  },
  {
    id: "2026-09-22-a-promotion-with-a-picture",
    date: "2026-09-22",
    version: "4.62.0",
    tag: "improved",
    href: "/settings?tab=customization",
    title: {
      en: "Your promotion can carry a picture",
      bn: "প্রোমোশনে এখন ছবি দেওয়া যাবে",
    },
    body: {
      en: "A promotion was a coloured band with words on it. Now it comes three ways — words on a band, a picture beside them, or a picture behind them with your words over it — and you can add a small line above the headline, like “Limited time”. The countdown, the start and end times and everything else stay exactly where they were.",
      bn: "আগে প্রোমোশন ছিল শুধু রঙিন ব্যান্ডে কিছু লেখা। এখন তিনভাবে দেখানো যায় — ব্যান্ডে শুধু লেখা, লেখার পাশে ছবি, কিংবা লেখার পেছনে ছবি — আর শিরোনামের উপরে ছোট একটি লাইনও দেওয়া যায়, যেমন “সীমিত সময়”। কাউন্টডাউন, শুরু-শেষের সময় আর বাকি সবকিছু আগের জায়গাতেই আছে।",
    },
  },
  {
    id: "2026-09-22-three-departments-on-your-home-page",
    date: "2026-09-22",
    version: "4.59.0",
    tag: "improved",
    href: "/settings?tab=customization",
    title: {
      en: "Your home page picks three categories",
      bn: "হোম পেজে এখন তিনটি ক্যাটাগরি",
    },
    body: {
      en: "Your home page used to show a row for every category you have, which on a full shop meant scrolling past twenty of them. Now you tick three in Customization, and each row carries that category and everything inside it. Under them is a new button that opens every product you sell, on a page of its own.",
      bn: "আগে আপনার প্রতিটি ক্যাটাগরির জন্য একটি করে সারি দেখানো হতো — বড় দোকানে কুড়িটিরও বেশি। এখন কাস্টমাইজেশনে তিনটি টিক করে দেবেন, আর প্রতিটি সারিতে সেই ক্যাটাগরি ও তার ভেতরের সব পণ্য থাকবে। নিচে নতুন একটি বোতাম, যেখানে চাপ দিলে আপনার সব পণ্য নিয়ে আলাদা একটি পাতা খুলবে।",
    },
  },
  {
    id: "2026-09-22-promises-on-your-home-page",
    date: "2026-09-22",
    version: "4.57.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Tell shoppers what you promise",
      bn: "ক্রেতাকে জানান আপনি কী কথা দিচ্ছেন",
    },
    body: {
      en: "Under your categories you can now show up to four promises — cash on delivery, easy returns, help every day — ticked from a list of sixteen. They are written in each shopper's own language, English or Bangla, so you never write them twice. The same four appear on every product page, where the old fixed wording used to sit.",
      bn: "ক্যাটাগরির নিচে এখন চারটি পর্যন্ত প্রতিশ্রুতি দেখানো যাবে — ক্যাশ অন ডেলিভারি, সহজ রিটার্ন, প্রতিদিন সহায়তা — ষোলোটির তালিকা থেকে টিক করে। প্রতিটি ক্রেতা নিজের ভাষায় সেগুলো পড়বেন, ইংরেজি হোক বা বাংলা, তাই দুবার লিখতে হবে না। একই চারটি প্রতিটি প্রোডাক্ট পাতায়ও দেখা যাবে, যেখানে আগে বাঁধা লেখা ছিল।",
    },
  },
  {
    id: "2026-09-22-home-page-product-rows",
    date: "2026-09-22",
    version: "4.55.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Three new rows for your home page",
      bn: "হোম পেজের জন্য তিনটি নতুন সারি",
    },
    body: {
      en: "Under your categories you can now show a row of products you choose yourself, a row of your best sellers, and a row of whatever you added most recently. You fill the first one by ticking a list — up to eight at a time — and the other two fill themselves from your shop, so there is nothing to keep up to date. Each row scrolls sideways, and “Browse everything” opens a page of its own with the rest.",
      bn: "ক্যাটাগরির নিচে এখন তিনটি সারি দেখানো যাবে — আপনার বেছে নেওয়া পণ্য, সবচেয়ে বেশি বিক্রি হওয়া পণ্য, আর সবশেষে যেগুলো যোগ করেছেন। প্রথম সারিটি একসাথে আটটি পণ্য টিক করে ভরা যায়, আর অন্য দুটি নিজেই ভরে যায়। প্রতিটি সারি পাশে সরানো যায়, আর “সব দেখুন” চাপলে বাকিগুলো নিয়ে আলাদা পাতা খোলে।",
    },
  },
  {
    id: "2026-09-22-hero-pictures-in-customization",
    date: "2026-09-22",
    version: "4.53.0",
    tag: "improved",
    href: "/settings?tab=customization",
    title: {
      en: "Your home page pictures are yours again",
      bn: "হোম পেজের ছবিগুলো আবার আপনার হাতে",
    },
    body: {
      en: "Changing them meant asking us: the Banners screen had gone and nothing replaced it. They are in Customization now — click the big picture on your home page and you can add up to five, order them, choose where a tap goes, and set how long each one stays. Your shop is showing exactly the pictures it showed yesterday.",
      bn: "এগুলো বদলাতে আমাদের বলতে হতো: ব্যানার পাতাটি উঠে গিয়েছিল আর তার বদলে কিছু আসেনি। এখন সেগুলো কাস্টমাইজেশনে — হোম পেজের বড় ছবিতে চাপ দিলে পাঁচটি পর্যন্ত ছবি যোগ করা যাবে, ক্রম বদলানো যাবে, চাপ দিলে কোথায় যাবে তা ঠিক করা যাবে, আর প্রতিটি ছবি কত সময় থাকবে তাও। গতকাল যে ছবিগুলো ছিল ঠিক সেগুলোই দেখাচ্ছে।",
    },
  },
  {
    id: "2026-09-22-one-announcement-bar",
    date: "2026-09-22",
    version: "4.50.0",
    tag: "improved",
    href: "/settings?tab=customization",
    title: {
      en: "Your notice bar moves into Customization",
      bn: "নোটিশ বারটি কাস্টমাইজেশনে চলে এসেছে",
    },
    body: {
      en: "The strip across the top of your shop was set in Settings → Promotions while a separate announcement bar sat in Customization doing the same thing. There is one now, in Customization, where you can also give it a link, the words to tap, and dates to start and stop on. Whatever your strip says today says exactly the same thing, and the two notice permissions have left your team's permission list — the bar is part of Customization now, so whoever may customise your shop may write it.",
      bn: "দোকানের উপরের স্ট্রিপটি সেটিংস → প্রোমোশন থেকে ঠিক করা হতো, আবার কাস্টমাইজেশনে আলাদা একটি অ্যানাউন্সমেন্ট বারও একই কাজ করত। এখন একটিই আছে, কাস্টমাইজেশনে — সেখানে লিংক, চাপ দেওয়ার লেখা, আর শুরু ও শেষের তারিখও দিতে পারবেন। আপনার স্ট্রিপে আজ যা লেখা আছে ঠিক তা-ই থাকবে, আর টিমের পারমিশন তালিকা থেকে নোটিফিকেশনের দুটি পারমিশন সরে গেছে — বারটি এখন কাস্টমাইজেশনের অংশ, তাই যিনি দোকান কাস্টমাইজ করতে পারেন তিনিই এটি লিখতে পারবেন।",
    },
  },
  {
    id: "2026-09-22-you-are-told-a-review-is-waiting",
    date: "2026-09-22",
    version: "4.48.0",
    tag: "improved",
    href: "/reviews",
    title: {
      en: "You are told when a review is waiting",
      bn: "রিভিউ অপেক্ষায় থাকলে আপনি জানতে পারবেন",
    },
    body: {
      en: "Nothing a customer writes appears on your shop until you approve it, so a review could sit unread if you did not think to check the tab. Reviews now shows how many are waiting right on the sidebar, and a waiting review turns up in your notifications. Someone polishing their own review a few times only ever counts once.",
      bn: "ক্রেতার লেখা কিছুই আপনার অনুমোদন ছাড়া দোকানে দেখা যায় না, তাই ট্যাবটি খুলে না দেখলে কোনো রিভিউ অনেকদিন পড়ে থাকতে পারত। এখন সাইডবারে রিভিউর পাশেই কতগুলো অপেক্ষায় আছে তা দেখা যায়, আর অপেক্ষমাণ রিভিউ আপনার নোটিফিকেশনেও আসে। কেউ নিজের রিভিউ কয়েকবার ঠিকঠাক করলেও সেটি একবারই গোনা হয়।",
    },
  },
  {
    id: "2026-09-22-customers-can-create-an-account",
    date: "2026-09-22",
    version: "4.47.0",
    tag: "improved",
    title: {
      en: "A proper sign-up for your customers",
      bn: "ক্রেতাদের জন্য পূর্ণাঙ্গ সাইন-আপ",
    },
    body: {
      en: "Your shop now has a Create account page that asks for a first name, last name, phone number and email, so every customer in your Accounts list has a real name and number instead of just an address. Anyone signing in with an address you have never seen is asked the same three things before their account is made, so no nameless rows can appear. There is still no password to remember — they get a link by email as before.",
      bn: "আপনার দোকানে এখন একটি \"অ্যাকাউন্ট তৈরি করুন\" পাতা আছে, যেখানে নামের প্রথম ও শেষ অংশ, ফোন নম্বর আর ইমেইল চাওয়া হয় — ফলে অ্যাকাউন্ট তালিকায় প্রত্যেক ক্রেতার আসল নাম ও নম্বর থাকবে, শুধু ঠিকানা নয়। আপনার কাছে আগে কখনো আসেনি এমন ঠিকানা দিয়ে কেউ সাইন ইন করলে অ্যাকাউন্ট তৈরির আগে তাঁকেও একই তিনটি তথ্য জিজ্ঞাসা করা হয়, তাই নামহীন কোনো সারি আর আসবে না। আগের মতোই কোনো পাসওয়ার্ড মনে রাখতে হয় না — ইমেইলে লিংক চলে যায়।",
    },
  },
  {
    id: "2026-09-22-customer-figures-are-counted",
    date: "2026-09-22",
    version: "4.46.0",
    tag: "fixed",
    href: "/customers",
    title: {
      en: "Repeat customer filter shows the right people",
      bn: "রিপিট কাস্টমার ফিল্টার এখন সঠিক তালিকা দেখায়",
    },
    body: {
      en: "Filtering your customers by repeat buyers read a saved note that slowly went out of date, so it could show the wrong people while every figure beside it was right. Orders and spending are now counted fresh every time you look, so nothing can drift again. A parcel that came back no longer counts as money that customer spent, and someone who orders from a new address now has that address on their record.",
      bn: "রিপিট কাস্টমার দিয়ে ফিল্টার করলে আগে একটি পুরোনো হয়ে যাওয়া হিসাব পড়া হতো, ফলে পাশের সব সংখ্যা ঠিক থাকলেও ভুল মানুষ তালিকায় আসতে পারত। এখন অর্ডার আর খরচ প্রতিবার নতুন করে গোনা হয়, তাই আর কোনো হিসাব পুরোনো হবে না। ফেরত আসা পার্সেল আর ক্রেতার খরচ হিসেবে গোনা হয় না, আর কেউ নতুন ঠিকানা থেকে অর্ডার করলে তাঁর রেকর্ডে সেই নতুন ঠিকানাই থাকে।",
    },
  },
  {
    id: "2026-09-22-order-status-everywhere",
    date: "2026-09-22",
    version: "4.45.0",
    tag: "improved",
    title: {
      en: "Customers can see where their order is",
      bn: "ক্রেতারা তাঁদের অর্ডার কোথায় আছে দেখতে পাবেন",
    },
    body: {
      en: "On a customer's account page every order now shows where it has got to, which it did not show at all before — a cancelled order looked the same as a delivered one. On the order-tracking page they can now tell a confirmed order from one you have not looked at yet, instead of both saying the same thing.",
      bn: "ক্রেতার অ্যাকাউন্ট পাতায় প্রতিটি অর্ডার এখন কোন অবস্থায় আছে তা দেখায় — আগে এটি একেবারেই দেখাত না, বাতিল হওয়া অর্ডার আর ডেলিভারি হওয়া অর্ডার একরকম দেখাত। অর্ডার ট্র্যাকিং পাতায় এখন নিশ্চিত করা অর্ডার আর আপনি এখনো দেখেননি এমন অর্ডারের পার্থক্য বোঝা যায়, আগে দুটোই একই কথা বলত।",
    },
  },
  {
    id: "2026-09-22-customer-reviews",
    date: "2026-09-22",
    version: "4.44.0",
    tag: "new",
    href: "/reviews",
    title: {
      en: "Customers can review your products",
      bn: "ক্রেতারা এখন আপনার পণ্যের রিভিউ দিতে পারবেন",
    },
    body: {
      en: "A signed-in customer can give a product stars, a few words and up to two photos, and nothing appears on your shop until you approve it in the new Reviews tab. You can approve, reject, reply, delete, or add one yourself from a screenshot — which is marked, so shoppers can tell. Anyone can read your reviews signed in or not, someone who actually received the item is marked a verified buyer, and a customer who edits their own sends it back to you for approval.",
      bn: "সাইন-ইন করা ক্রেতা পণ্যে স্টার, কয়েক লাইন লেখা আর সর্বোচ্চ দুটি ছবি দিতে পারবেন, আর নতুন রিভিউ ট্যাবে আপনি অনুমোদন না করা পর্যন্ত দোকানে কিছুই দেখা যাবে না। অনুমোদন, বাতিল, উত্তর, মুছে ফেলা — সবই আপনার হাতে, আর স্ক্রিনশট থেকে নিজেও একটি যোগ করতে পারবেন, যেটি আলাদা করে চিহ্নিত থাকে। রিভিউ সবাই পড়তে পারবেন, যিনি সত্যিই পণ্যটি পেয়েছেন তাঁকে যাচাই করা ক্রেতা হিসেবে দেখানো হয়, আর কোনো ক্রেতা নিজের রিভিউ বদলালে সেটি আবার আপনার অনুমোদনের জন্য ফিরে আসে।",
    },
  },
  {
    id: "2026-09-22-whatsapp-link-in-the-footer-works",
    date: "2026-09-22",
    version: "4.43.0",
    tag: "fixed",
    href: "/settings",
    title: {
      en: "Your WhatsApp link in the footer works now",
      bn: "ফুটারের হোয়াটসঅ্যাপ লিংক এখন কাজ করে",
    },
    body: {
      en: "The WhatsApp box in Settings asks for a number or a link, but if you gave it a number the footer link went nowhere — it landed on a “page not found” on your own shop. Give it a number in any form you like now, with or without the dashes or the 880, and the link opens a chat with you.",
      bn: "সেটিংসের হোয়াটসঅ্যাপ ঘরে নম্বর বা লিংক — যেকোনোটি দেওয়া যায়, কিন্তু নম্বর দিলে ফুটারের লিংকটি কোথাও যেত না, আপনার নিজের দোকানেই “পেজ পাওয়া যায়নি” দেখাত। এখন যেভাবেই নম্বর লিখুন — ড্যাশসহ বা ছাড়া, ৮৮০ সহ বা ছাড়া — লিংকে চাপ দিলে আপনার সঙ্গেই চ্যাট খুলবে।",
    },
  },
  {
    id: "2026-09-22-premium-parts-are-labelled",
    date: "2026-09-22",
    version: "4.42.0",
    tag: "improved",
    href: "/settings?tab=customization",
    title: {
      en: "Premium parts are shown, not hidden",
      bn: "প্রিমিয়ামের অংশগুলো লুকানো নয়, দেখানো হয়",
    },
    body: {
      en: "When you add something to a page in Customization, the parts that come with Premium are listed too, marked “On the Premium plan”, so you can see what your shop could have. If your plan ever lapses, anything you already placed stays saved exactly as you left it — your shop simply stops showing it, and it comes back the day you are on Premium again.",
      bn: "কাস্টমাইজেশনে কোনো পাতায় কিছু যোগ করার সময় প্রিমিয়ামের সঙ্গে আসা অংশগুলোও তালিকায় থাকে, “প্রিমিয়াম প্ল্যানে পাওয়া যায়” লেখা সহ — তাই আপনার দোকানে আর কী কী থাকতে পারত তা দেখতে পাবেন। প্ল্যানের মেয়াদ শেষ হয়ে গেলেও আগে বসানো জিনিস যেমন ছিল তেমনই সেভ থাকে — দোকানে শুধু দেখানো বন্ধ হয়, আর আবার প্রিমিয়ামে ফিরলেই সেটি ফিরে আসে।",
    },
  },
  {
    id: "2026-09-22-answer-the-question-once",
    date: "2026-09-22",
    version: "4.41.0",
    tag: "new",
    href: "/products",
    title: {
      en: "Answer a question once, not forty times",
      bn: "একবার উত্তর দিন, চল্লিশ বার নয়",
    },
    body: {
      en: "Every product now has a Questions & answers box on its page in your dashboard — write “does it come in XL” and your answer once, and it shows on that product in your shop. There is a second one for questions about the whole shop, like delivery outside Dhaka or exchanges, which you can put on your home page, a category or the blog. Shoppers tap a question to open the answer, and their browser's find-on-page still reaches the text inside.",
      bn: "প্রতিটি পণ্যের পাতায় এখন ড্যাশবোর্ডে “প্রশ্ন ও উত্তর” বক্স আছে — “XL সাইজ আছে কি” আর তার উত্তর একবার লিখে রাখলেই সেটি আপনার দোকানে ওই পণ্যের পাতায় দেখা যাবে। পুরো দোকান নিয়ে প্রশ্নের জন্য আলাদা একটি আছে — যেমন ঢাকার বাইরে ডেলিভারি বা বদলানোর নিয়ম — যা হোম পেজ, ক্যাটাগরি বা ব্লগে বসানো যায়। ক্রেতা প্রশ্নে চাপ দিলেই উত্তর খুলে যায়, আর ব্রাউজারের খোঁজার সুবিধাও ভেতরের লেখা পর্যন্ত পৌঁছায়।",
    },
  },
  {
    id: "2026-09-22-promotions-that-start-and-stop",
    date: "2026-09-22",
    version: "4.40.0",
    tag: "new",
    title: {
      en: "Promotions that start and stop on their own",
      bn: "নিজে থেকেই শুরু আর শেষ হওয়া প্রোমোশন",
    },
    body: {
      en: "On Premium, a promotion band with a heading, a message and a button can be given a start and an end in Bangladesh time, and it appears and disappears by itself — no waking up at midnight to take a sale down. Switch on the countdown and shoppers see the time left ticking. It vanishes the second it ends, even for someone already sitting on the page.",
      bn: "প্রিমিয়াম প্ল্যানে শিরোনাম, বার্তা আর বোতামসহ প্রোমোশন ব্যান্ডে বাংলাদেশ সময় অনুযায়ী শুরু আর শেষের সময় দেওয়া যায় — সেটি নিজে থেকেই আসবে আর চলে যাবে, সেল বন্ধ করতে মাঝরাতে জেগে থাকতে হবে না। কাউন্টডাউন চালু করলে ক্রেতারা বাকি সময় কমতে দেখবেন। শেষ হওয়ার সঙ্গে সঙ্গেই এটি চলে যায় — যিনি আগে থেকেই পাতায় আছেন তাঁর কাছেও।",
    },
  },
  {
    id: "2026-09-22-put-a-video-on-your-shop",
    date: "2026-09-22",
    version: "4.39.0",
    tag: "new",
    title: {
      en: "Put a video on your shop",
      bn: "দোকানে ভিডিও যোগ করুন",
    },
    body: {
      en: "Paste a link from YouTube, Facebook or Vimeo and a video section appears on your home page, a category or a product — any normal link works, including a Shorts or a share link. Shoppers see your cover picture and a play button, and nothing is loaded from YouTube until somebody presses it, so the page stays fast and no shopper is reported to anyone who never watched. Reels and other tall videos have a shape of their own so they are not squeezed into a wide box.",
      bn: "ইউটিউব, ফেসবুক বা ভিমিও থেকে একটি লিংক বসালেই আপনার হোম পেজ, ক্যাটাগরি বা পণ্যের পাতায় ভিডিও সেকশন যোগ হবে — শর্টস বা শেয়ার লিংকসহ সাধারণ যেকোনো লিংকই চলবে। ক্রেতারা আপনার কভার ছবি আর একটি প্লে বোতাম দেখবেন, আর কেউ সেটি না চাপা পর্যন্ত ইউটিউব থেকে কিছুই লোড হয় না — তাই পাতা দ্রুত থাকে আর যে ক্রেতা ভিডিও দেখেননি তাঁর কথা কোথাও যায় না। রিলসের মতো লম্বা ভিডিওর জন্য আলাদা আকার আছে, তাই সেগুলো চওড়া বাক্সে চেপে বসে না।",
    },
  },
  {
    id: "2026-09-22-a-block-of-text-anywhere",
    date: "2026-09-22",
    version: "4.39.0",
    tag: "fixed",
    title: {
      en: "The Text section works now",
      bn: "লেখার সেকশনটি এখন কাজ করে",
    },
    body: {
      en: "Text has been on the list of sections you can add since customization opened, and adding it left that part of the page blank. It now draws the heading and the words you typed, keeping your line breaks, and it can go on the home page, a category, a product or the blog.",
      bn: "কাস্টমাইজেশন চালু হওয়ার পর থেকেই যোগ করার তালিকায় লেখা সেকশনটি ছিল, কিন্তু যোগ করলে পাতার ওই অংশ ফাঁকা থেকে যেত। এখন আপনার শিরোনাম আর লেখা ঠিকঠাক দেখাবে, লাইন ভাঙাও অক্ষত থাকবে — আর এটি হোম পেজ, ক্যাটাগরি, পণ্য বা ব্লগ যেকোনো জায়গায় বসানো যাবে।",
    },
  },
  {
    id: "2026-09-22-theme-pictures-show-again",
    date: "2026-09-22",
    version: "4.39.0",
    tag: "fixed",
    title: {
      en: "Pictures you placed in Customization show again",
      bn: "কাস্টমাইজেশনে বসানো ছবিগুলো আবার দেখা যাবে",
    },
    body: {
      en: "Shops customised before the single-design change kept an old name for their design inside their saved settings, and your shop could not match it to anything — so every picture you had placed there stopped loading, and Customization would not open. The saved settings have been corrected and nothing you arranged was changed.",
      bn: "একক ডিজাইনে যাওয়ার আগে যেসব দোকান কাস্টমাইজ করা হয়েছিল, তাদের সেভ করা সেটিংসে ডিজাইনের পুরোনো নামটি রয়ে গিয়েছিল, আর দোকান সেটির সঙ্গে কিছু মেলাতে পারত না — ফলে ওখানে বসানো ছবিগুলো আর লোড হতো না এবং কাস্টমাইজেশনও খুলত না। সেভ করা সেটিংস ঠিক করে দেওয়া হয়েছে, আপনার সাজানো কিছুই বদলায়নি।",
    },
  },
  {
    id: "2026-09-22-brands-are-records",
    date: "2026-09-22",
    version: "4.38.0",
    tag: "new",
    href: "/brands",
    title: {
      en: "Your brands get a page of their own",
      bn: "আপনার ব্র্যান্ডের জন্য আলাদা পাতা",
    },
    body: {
      en: "Brands now have their own tab with a logo and a description, and each one gets a page in your shop with a link in the footer. On a product you pick a brand from the list instead of typing it, so Bata, bata and BATA can no longer be three brands — the ones you already had were merged, keeping the spelling you used most. A shop that sells only its own goods can leave the tab empty and nothing about it changes.",
      bn: "ব্র্যান্ডের জন্য এখন আলাদা ট্যাব আছে, যেখানে লোগো আর বিবরণ দেওয়া যায়, আর প্রতিটি ব্র্যান্ড আপনার দোকানে নিজের পাতা পায় — ফুটারে তার লিংকও থাকে। পণ্যের পাতায় এখন ব্র্যান্ডের নাম টাইপ না করে তালিকা থেকে বেছে নিতে হয়, তাই Bata, bata আর BATA আর আলাদা তিনটি ব্র্যান্ড থাকতে পারে না — আগের নামগুলো এক করে দেওয়া হয়েছে, আর আপনি যে বানানটি সবচেয়ে বেশি লিখেছেন সেটিই রাখা হয়েছে। যে দোকান শুধু নিজের পণ্য বিক্রি করে, সে ট্যাবটি খালি রাখতে পারে — কিছুই বদলাবে না।",
    },
  },
  {
    id: "2026-09-22-team-can-reach-discount-codes",
    date: "2026-09-22",
    version: "4.38.0",
    tag: "fixed",
    href: "/settings?tab=team",
    title: {
      en: "Your team can reach discount codes again",
      bn: "আপনার টিম আবার ডিসকাউন্ট কোডে পৌঁছাতে পারবে",
    },
    body: {
      en: "Discount codes were reaching only the store owner: the permission existed but was never given to the Admin, Manager and Viewer roles on shops created before it. Those roles now have it, along with the new Brands permission, and anything you changed yourself on a role was left alone.",
      bn: "ডিসকাউন্ট কোড শুধু দোকানের মালিকের কাছেই পৌঁছাত: অনুমতিটি ছিল, কিন্তু তার আগে তৈরি হওয়া দোকানগুলোর অ্যাডমিন, ম্যানেজার ও ভিউয়ার ভূমিকায় সেটি কখনো দেওয়া হয়নি। এখন ওই ভূমিকাগুলো সেটি পেয়েছে, সঙ্গে নতুন ব্র্যান্ড অনুমতিও — আর কোনো ভূমিকায় আপনি নিজে যা বদলেছিলেন তা অক্ষত আছে।",
    },
  },
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
    id: "2026-09-22-theme-editor-and-live-preview",
    date: "2026-09-22",
    version: "4.12.0",
    tag: "new",
    title: {
      en: "Choose a theme and design your store",
      bn: "থিম বেছে নিন, নিজের মতো স্টোর সাজান",
    },
    body: {
      en: "In Settings → Customization you can now pick a theme and open a full screen editor, where you change each page's text, links and parts while your store updates beside you. What you change stays a draft your shoppers can't see until you press Save to store. Themes are part of the Premium plan.",
      bn: "সেটিংস → কাস্টমাইজেশন থেকে এখন একটি থিম বেছে নিয়ে পুরো স্ক্রিনের এডিটর খুলতে পারবেন, যেখানে প্রতিটি পেজের লেখা, লিংক আর অংশগুলো বদলাবেন আর পাশেই আপনার স্টোর বদলাতে দেখবেন। যা বদলান তা ড্রাফট হয়ে থাকে, ক্রেতারা দেখেন না; স্টোরে সংরক্ষণ বাটনে চাপলেই তা স্টোরে যায়। থিম প্রিমিয়াম প্ল্যানের অংশ।",
    },
    href: "/settings?tab=customization",
  },
];
