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
    id: "2026-09-29-setup-fits-where-you-already-sell",
    date: "2026-09-29",
    version: "4.139.0",
    tag: "new",
    title: {
      en: "Setup fits where you already sell",
      bn: "যেখানে বিক্রি করেন, সেট-আপ সেভাবেই",
    },
    body: {
      en: "New shops are asked where they sell now: Facebook, Instagram, TikTok or a shop in person. Your setup guide then adds the steps that fit, like your Facebook Pixel or your shop's address.",
      bn: "নতুন দোকানকে জিজ্ঞেস করা হয় এখন কোথায় বিক্রি করেন: Facebook, Instagram, TikTok নাকি সরাসরি দোকানে। এরপর সেট-আপ গাইডে মানানসই ধাপ যোগ হয়, যেমন Facebook Pixel বা দোকানের ঠিকানা।",
    },
  },
  {
    id: "2026-09-29-sign-up-shows-the-free-trial",
    date: "2026-09-29",
    version: "4.138.0",
    tag: "improved",
    title: {
      en: "Sign up shows the free trial up front",
      bn: "অ্যাকাউন্ট খোলার পাতায় ফ্রি ট্রায়াল",
    },
    body: {
      en: "Right under Create account, new shop owners now see how many days their free trial lasts, and that nothing is paid to start.",
      bn: "\"অ্যাকাউন্ট খুলুন\"-এর ঠিক নিচে নতুন দোকান মালিকেরা এখন দেখেন ফ্রি ট্রায়াল কত দিনের, আর শুরু করতে কোনো পেমেন্ট লাগে না।",
    },
  },
  {
    id: "2026-09-29-sign-in-catches-a-mistyped-email",
    date: "2026-09-29",
    version: "4.137.0",
    tag: "improved",
    title: {
      en: "Sign in catches a mistyped email",
      bn: "সাইন ইন ভুল লেখা ইমেইল ধরে ফেলে",
    },
    body: {
      en: "Typed gmial.com or gmail.con by mistake? Sign in and sign up now ask \"Did you mean …@gmail.com?\", and one tap fixes it, so your sign-in email reaches an inbox you can open.",
      bn: "ভুল করে gmial.com বা gmail.con লিখেছেন? সাইন ইন ও অ্যাকাউন্ট খোলার পাতা এখন জিজ্ঞেস করে \"আপনি কি …@gmail.com লিখতে চেয়েছিলেন?\", আর এক ট্যাপে ঠিক হয়ে যায়, তাই সাইন-ইন ইমেইল আপনার খোলা যায় এমন ইনবক্সেই পৌঁছায়।",
    },
  },
  {
    id: "2026-09-29-sign-in-with-a-code",
    date: "2026-09-29",
    version: "4.136.0",
    tag: "new",
    title: {
      en: "Sign in with a code from your email",
      bn: "ইমেইলের কোড দিয়ে সাইন ইন",
    },
    body: {
      en: "Every sign-in email now has a 6-digit code as well as the link. Opened the email on your phone? Type the code on the computer you're signing in on, and you're in.",
      bn: "প্রতিটি সাইন-ইন ইমেইলে এখন লিংকের সাথে ৬ অঙ্কের একটি কোডও থাকে। ইমেইলটি ফোনে খুলেছেন? যে কম্পিউটারে সাইন ইন করছেন সেখানে কোডটি লিখলেই হয়ে যাবে।",
    },
  },
  {
    id: "2026-09-29-a-new-sign-in-and-setup",
    date: "2026-09-29",
    version: "4.136.0",
    tag: "new",
    title: {
      en: "A new sign in, in English and Bangla",
      bn: "নতুন সাইন-ইন, ইংরেজি ও বাংলায়",
    },
    body: {
      en: "Signing in and signing up have a fresh look, and both now read in Bangla too. New shops are set up in five short questions, beside a live preview of the whole home page, as a computer or a phone shows it, and can connect their own domain on the way. Each step saves as you answer it, so you can pick up where you left off on any device, and when setup finishes the real shop opens beside you.",
      bn: "সাইন ইন ও অ্যাকাউন্ট খোলার পাতা এখন নতুন চেহারায়, আর দুটোই বাংলাতেও পড়া যায়। নতুন দোকান এখন পাঁচটি ছোট প্রশ্নে সাজানো যায়, পাশে পুরো হোম পেজের লাইভ প্রিভিউ দেখে (কম্পিউটারে বা মোবাইলে যেমন দেখাবে), আর সাথেই নিজের ডোমেইনও যুক্ত করা যায়। প্রতিটি ধাপ উত্তর দেওয়ার সাথে সাথেই সংরক্ষণ হয়, তাই যেকোনো ডিভাইস থেকে যেখানে থেমেছিলেন সেখান থেকে শুরু করা যায়, আর সেট-আপ শেষ হলে পাশেই আসল দোকানটি খুলে যায়।",
    },
  },
  {
    id: "2026-09-29-your-setup-guide",
    date: "2026-09-29",
    version: "4.136.0",
    tag: "new",
    title: {
      en: "A setup guide on your home page",
      bn: "হোম পেজে সেট-আপ গাইড",
    },
    body: {
      en: "Your home page shows what your shop still needs before its first real order: a product, delivery charges, and a courier. Each step ticks itself when it's done, and you can skip the guide any time.",
      bn: "আপনার হোম পেজ দেখায় প্রথম অর্ডারের আগে দোকানের আর কী লাগবে: একটি পণ্য, ডেলিভারি চার্জ আর একটি কুরিয়ার। প্রতিটি ধাপ শেষ হলে নিজেই টিক পড়ে, আর যেকোনো সময় গাইডটি বাদ দিতে পারবেন।",
    },
  },
  {
    id: "2026-09-29-customers-count-matches-your-orders",
    date: "2026-09-29",
    version: "4.130.0",
    tag: "fixed",
    title: {
      en: "Your Customers count now matches your orders",
      bn: "গ্রাহকের সংখ্যা এখন অর্ডারের সাথে মেলে",
    },
    body: {
      en: "The Customers card on your home page now counts the different people who ordered in those days, leaving out cancelled orders just as the Orders card does. It used to count every new shopper, so it could show more customers than orders.",
      bn: "হোম পেজের গ্রাহক কার্ড এখন সেই সময়ে যাঁরা অর্ডার করেছেন তাঁদের গোনে, বাতিল অর্ডার বাদ দিয়ে, ঠিক অর্ডার কার্ডের মতো। আগে প্রত্যেক নতুন ক্রেতাকে গুনত, তাই কখনো অর্ডারের চেয়ে বেশি গ্রাহক দেখাত।",
    },
  },
  {
    id: "2026-09-29-send-to-courier-says-why",
    date: "2026-09-29",
    version: "4.130.0",
    tag: "fixed",
    href: "/orders",
    title: {
      en: "Send to courier says why it didn't go",
      bn: "কুরিয়ারে না গেলে কারণ জানায়",
    },
    body: {
      en: "When an order doesn't reach the courier, a note now says so with the reason, such as a phone number the courier won't take or courier keys that need checking. The button used to go back to Send without a word.",
      bn: "কোনো অর্ডার কুরিয়ারে না গেলে এখন একটি বার্তা তা কারণসহ জানায়, যেমন কুরিয়ার যে ফোন নম্বর নেয় না বা যে কুরিয়ার কী আবার দেখা দরকার। আগে বোতামটি কিছু না বলেই আবার Send হয়ে যেত।",
    },
  },
  {
    id: "2026-09-29-deleting-a-category-with-products",
    date: "2026-09-29",
    version: "4.130.0",
    tag: "fixed",
    href: "/categories",
    title: {
      en: "Deleting a category that still has products",
      bn: "পণ্য থাকা ক্যাটাগরি মুছতে গেলে",
    },
    body: {
      en: "It now tells you how many products to move to another category first, as a note rather than an error. And the category keeps its picture: a delete that was refused used to remove it.",
      bn: "এখন জানায় আগে কতগুলো পণ্য অন্য ক্যাটাগরিতে সরাতে হবে, সমস্যা হিসেবে নয়, একটি বার্তা হিসেবে। আর ক্যাটাগরির ছবিও থেকে যায়: আগে মুছতে না পারলেও ছবিটি মুছে যেত।",
    },
  },
  {
    id: "2026-09-29-small-clean-notes",
    date: "2026-09-29",
    version: "4.130.0",
    tag: "improved",
    title: {
      en: "Small, clean notes after you do something",
      bn: "কিছু করার পরে ছোট, পরিষ্কার বার্তা",
    },
    body: {
      en: "The note that pops up after you save or delete something is now one small line with an icon, at the bottom of the page you're working on. Show more opens an error's details, done notes go after 3 seconds and errors after 8, and × closes any of them.",
      bn: "কিছু সেভ বা মুছে ফেলার পরে যে বার্তা আসে, তা এখন আইকনসহ এক লাইনের ছোট বার্তা, আপনি যে পেজে কাজ করছেন তার নিচে। “আরও দেখুন” চাপলে সমস্যার বিস্তারিত খোলে, কাজ হয়ে যাওয়ার বার্তা ৩ সেকেন্ডে আর সমস্যার বার্তা ৮ সেকেন্ডে চলে যায়, আর × চাপলে যেকোনোটি বন্ধ হয়।",
    },
  },
  {
    id: "2026-09-29-a-checkout-warning-shoppers-notice",
    date: "2026-09-29",
    version: "4.127.0",
    tag: "improved",
    href: "/settings?tab=customization",
    title: {
      en: "A checkout warning shoppers notice",
      bn: "চেকআউটে এমন সতর্কতা যা ক্রেতার চোখে পড়ে",
    },
    body: {
      en: "The warning box above the order button is amber now, and its border glows gently so shoppers see it before they order. Its words sit in the centre, and you can move them to the left or right, for the plain line too. Find it in Customization, on the Checkout page.",
      bn: "অর্ডার বোতামের উপরের সতর্কতার বাক্স এখন কমলা-হলুদ, আর এর বর্ডার আস্তে আস্তে জ্বলে ওঠে, যাতে ক্রেতা অর্ডারের আগেই দেখেন। এর লেখা মাঝখানে বসে, আর আপনি বাঁয়ে বা ডানে সরাতে পারেন, সাধারণ লাইনের জন্যও। কাস্টমাইজেশনের চেকআউট পেজে পাবেন।",
    },
  },
  {
    id: "2026-09-29-choose-where-the-words-sit-on-product-cards",
    date: "2026-09-29",
    version: "4.127.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Choose where the words sit on product cards",
      bn: "প্রোডাক্ট কার্ডে লেখা কোথায় বসবে বেছে নিন",
    },
    body: {
      en: "A product's name and price can sit on the left, in the centre or on the right, on every card in your shop. Choose it in Customization, under Style. Cards stay centred until you change it.",
      bn: "প্রোডাক্টের নাম আর দাম আপনার দোকানের প্রতিটি কার্ডে বাঁয়ে, মাঝখানে বা ডানে বসতে পারে। কাস্টমাইজেশনের স্টাইলে বেছে নিন। না বদলানো পর্যন্ত কার্ড মাঝখানেই থাকে।",
    },
  },
  {
    id: "2026-09-29-make-your-thank-you-stand-out",
    date: "2026-09-29",
    version: "4.127.0",
    tag: "improved",
    href: "/settings?tab=customization",
    title: {
      en: "Make your thank-you stand out",
      bn: "আপনার ধন্যবাদ বার্তা আরও চোখে পড়ুক",
    },
    body: {
      en: "Your own words on the Order success page can now be bold, larger, and on a coloured background: soft grey, your main colour, the warning colour or green. Every colour keeps the words easy to read.",
      bn: "অর্ডার সফল পেজে আপনার নিজের কথা এখন মোটা অক্ষরে, আরও বড় করে, আর রঙিন পটভূমিতে দেখাতে পারেন: হালকা ধূসর, আপনার মূল রং, সতর্কতার রং বা সবুজ। প্রতিটি রঙেই লেখা সহজে পড়া যায়।",
    },
  },
  {
    id: "2026-09-29-your-own-words-after-a-cash-on-delivery-order",
    date: "2026-09-29",
    version: "4.126.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Your own words after a cash-on-delivery order",
      bn: "ক্যাশ অন ডেলিভারি অর্ডারের পরে আপনার নিজের কথা",
    },
    body: {
      en: "Order success is now a page in Customization. After a cash-on-delivery order, its top can show the courier animation, as it does today, or your own words, like a thank-you or when you will call. The heading and the order under it stay as they are.",
      bn: "অর্ডার সফল এখন কাস্টমাইজেশনের একটি পেজ। ক্যাশ অন ডেলিভারি অর্ডারের পরে এর উপরে কুরিয়ারের অ্যানিমেশন দেখাতে পারেন, যেমন এখন দেখায়, অথবা আপনার নিজের কথা, যেমন একটি ধন্যবাদ বা কখন ফোন করবেন। শিরোনাম আর তার নিচের অর্ডার যেমন আছে তেমনই থাকে।",
    },
  },
  {
    id: "2026-09-29-shoppers-on-phones-find-the-checkout-form",
    date: "2026-09-29",
    version: "4.126.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Shoppers on phones find the checkout form",
      bn: "ফোনে ক্রেতারা চেকআউট ফর্ম খুঁজে পান",
    },
    body: {
      en: "On a phone the order comes first and the form is below it. If a shopper is still on their order after 5 seconds, a small arrow at the bottom shows the way down, and a tap takes them to the form. You can turn it off or change the seconds in Customization, on the Checkout page.",
      bn: "ফোনে আগে অর্ডার আসে, ফর্ম তার নিচে। ৫ সেকেন্ড পরেও ক্রেতা অর্ডারেই থাকলে নিচে একটি ছোট তীর পথ দেখায়, আর তাতে চাপ দিলে ফর্মে নিয়ে যায়। কাস্টমাইজেশনের চেকআউট পেজে এটি বন্ধ করতে বা সেকেন্ড বদলাতে পারেন।",
    },
  },
  {
    id: "2026-09-29-analytics-counts-shoppers-who-stay",
    date: "2026-09-29",
    version: "4.126.0",
    tag: "fixed",
    href: "/analytics",
    title: {
      en: "Analytics now counts shoppers who stay",
      bn: "অ্যানালিটিক্স এখন থেকে যাওয়া ক্রেতাদের গোনে",
    },
    body: {
      en: "A visit where a shopper spent 10 seconds on a page was not being counted, so Engaged visits and Stay on read lower than they should. From today's visits on they are counted. Earlier days stay as they were.",
      bn: "যে ভিজিটে ক্রেতা একটি পেজে ১০ সেকেন্ড ছিলেন, তা গোনা হচ্ছিল না, তাই আগ্রহী ভিজিট আর থেকেছেন যতটা হওয়া উচিত তার চেয়ে কম দেখাত। আজকের ভিজিট থেকে এগুলো গোনা হয়। আগের দিনগুলো যেমন ছিল তেমনই থাকবে।",
    },
  },
  {
    id: "2026-09-29-your-contact-and-social-accounts-in-one-place",
    date: "2026-09-29",
    version: "4.125.0",
    tag: "new",
    href: "/settings?tab=store",
    title: {
      en: "Your contact and social accounts, in one place",
      bn: "যোগাযোগ আর সোশ্যাল অ্যাকাউন্ট, এক জায়গায়",
    },
    body: {
      en: "Settings > Store Info now has an Identity section for your phone, email, address and social accounts, from WhatsApp and Facebook to YouTube, Telegram, X, LinkedIn, Pinterest, Threads and Snapchat, in the order you like. Your footer, contact page and home page sign-up button all use them, and the sign-up button can open any of them. Your invoice terms and conditions moved to Settings > Policies.",
      bn: "সেটিংস > স্টোর তথ্যে এখন পরিচিতি অংশ আছে, আপনার ফোন, ইমেইল, ঠিকানা আর সোশ্যাল অ্যাকাউন্টের জন্য, হোয়াটসঅ্যাপ আর ফেসবুক থেকে ইউটিউব, টেলিগ্রাম, এক্স, লিংকডইন, পিন্টারেস্ট, থ্রেডস ও স্ন্যাপচ্যাট পর্যন্ত, আপনার পছন্দের ক্রমে। আপনার ফুটার, যোগাযোগ পাতা আর হোম পেজের সাইন-আপ বোতাম এগুলোই ব্যবহার করে, আর সাইন-আপ বোতাম এর যেকোনোটি খুলতে পারে। ইনভয়েসের শর্তাবলী এখন সেটিংস > নীতিমালায়।",
    },
  },
  {
    id: "2026-09-28-download-your-analytics",
    date: "2026-09-28",
    version: "4.124.0",
    tag: "new",
    href: "/analytics",
    title: {
      en: "Download your analytics as an Excel file",
      bn: "অ্যানালিটিক্স Excel ফাইলে ডাউনলোড করুন",
    },
    body: {
      en: "The Download button on the Analytics page makes an Excel file of the section you are on, or of every section, for the days you picked, in English or Bangla. The numbers stay numbers, so you can sort and add them up. Top customers now show their full phone number on the page; the file hides part of it.",
      bn: "অ্যানালিটিক্স পেজের ডাউনলোড বাটন আপনার বেছে নেওয়া দিনগুলোর জন্য এই অংশের, বা সব অংশের একটি Excel ফাইল তৈরি করে, ইংরেজি বা বাংলায়। সংখ্যাগুলো সংখ্যাই থাকে, তাই সাজানো আর যোগ করা যায়। শীর্ষ কাস্টমারদের পুরো ফোন নম্বর এখন পেজে দেখা যায়; ফাইলে এর কিছু অংশ লুকানো থাকে।",
    },
  },
  {
    id: "2026-09-28-a-new-analytics-page",
    date: "2026-09-28",
    version: "4.123.0",
    tag: "new",
    href: "/analytics",
    title: {
      en: "A new Analytics page",
      bn: "নতুন অ্যানালিটিক্স পেজ",
    },
    body: {
      en: "Pick any days and compare them with the days before or the same days last year. The Overview tells you in one sentence how you did, what moved it and which orders need a look, and each part has its own tab: Sales, Traffic, Products, Districts, Delivery, Customers and Live. On the Basic plan, Overview and Sales are open.",
      bn: "যেকোনো দিন বেছে নিন, আর তুলনা করুন আগের দিনগুলোর সাথে বা গত বছরের একই দিনগুলোর সাথে। সারসংক্ষেপ এক বাক্যে জানায় কেমন গেল, কী পার্থক্য গড়েছে আর কোন অর্ডার একবার দেখা দরকার; প্রতিটি অংশের নিজের ট্যাব আছে: বিক্রি, ভিজিটর, পণ্য, জেলা, ডেলিভারি, কাস্টমার আর লাইভ। বেসিক প্ল্যানে সারসংক্ষেপ আর বিক্রি খোলা থাকে।",
    },
  },
  {
    id: "2026-09-28-your-orders-on-a-map",
    date: "2026-09-28",
    version: "4.123.0",
    tag: "new",
    href: "/analytics",
    title: {
      en: "Your orders on a map of Bangladesh",
      bn: "বাংলাদেশের মানচিত্রে আপনার অর্ডার",
    },
    body: {
      en: "The Districts tab shows the eight divisions on a map, darker where you get more orders, sales or deliveries. Tap a division to see its districts.",
      bn: "জেলা ট্যাবে মানচিত্রে আটটি বিভাগ দেখা যায়; যেখানে অর্ডার, বিক্রি বা ডেলিভারি বেশি, সেখানে রং গাঢ়। কোনো বিভাগে চাপলে তার জেলাগুলো দেখাবে।",
    },
  },
  {
    id: "2026-09-28-what-shoppers-search-for",
    date: "2026-09-28",
    version: "4.123.0",
    tag: "new",
    href: "/analytics",
    title: {
      en: "See what shoppers search for",
      bn: "দেখুন ক্রেতারা কী খোঁজেন",
    },
    body: {
      en: "Searches on your shop are now counted. The Traffic tab lists what shoppers searched for, how many of them bought, and the searches that found nothing, so you know what to add.",
      bn: "আপনার দোকানে সার্চ এখন গোনা হয়। ভিজিটর ট্যাবে দেখা যায় ক্রেতারা কী খুঁজেছেন, তাঁদের কতজন কিনেছেন, আর কোন সার্চে কিছুই পাওয়া যায়নি, যাতে বুঝতে পারেন কী যোগ করবেন।",
    },
  },
  {
    id: "2026-09-28-the-dashboard-opens-lighter",
    date: "2026-09-28",
    version: "4.123.0",
    tag: "improved",
    title: {
      en: "The dashboard opens a little lighter",
      bn: "ড্যাশবোর্ড একটু হালকা হয়ে খোলে",
    },
    body: {
      en: "Fonts now load only when a page needs them, so English pages no longer download the Bangla font.",
      bn: "ফন্ট এখন শুধু দরকার হলেই আসে, তাই ইংরেজি পেজে আর বাংলা ফন্ট নামাতে হয় না।",
    },
  },
  {
    id: "2026-09-28-where-visitors-come-from",
    date: "2026-09-28",
    version: "4.122.0",
    tag: "new",
    href: "/analytics",
    title: {
      en: "See where your visitors come from",
      bn: "দেখুন আপনার ভিজিটর কোথা থেকে আসছেন",
    },
    body: {
      en: "Visits to your shop are counted again, whether or not you use a Facebook or TikTok pixel. Analytics shows where each visit came from, such as Facebook, Facebook ads or Google, with the orders and sales it brought.",
      bn: "আপনার দোকানের ভিজিট আবার গোনা হচ্ছে, ফেসবুক বা টিকটক পিক্সেল থাকুক বা না থাকুক। অ্যানালিটিক্সে দেখা যায় প্রতিটি ভিজিট কোথা থেকে এসেছে, যেমন ফেসবুক, ফেসবুক বিজ্ঞাপন বা গুগল, আর সেখান থেকে কত অর্ডার ও বিক্রি এসেছে।",
    },
  },
  {
    id: "2026-09-28-how-shoppers-give-their-district",
    date: "2026-09-28",
    version: "4.122.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Choose how shoppers give their district",
      bn: "ক্রেতারা কীভাবে জেলা দেবেন, আপনি ঠিক করুন",
    },
    body: {
      en: "On the checkout page of your theme editor, choose whether shoppers type their district or search and pick it from Bangladesh's 64, in your shop's language. Picked from the list, couriers always get a correct name. New order and order edit use the same list, searchable in English or Bangla.",
      bn: "থিম এডিটরের চেকআউট পেজে ঠিক করুন, ক্রেতারা জেলা লিখে দেবেন নাকি বাংলাদেশের ৬৪টি জেলা থেকে খুঁজে বেছে নেবেন, আপনার দোকানের ভাষায়। তালিকা থেকে বেছে নিলে কুরিয়ার সবসময় সঠিক নাম পায়। নতুন অর্ডার আর অর্ডার এডিটে একই তালিকা, ইংরেজি বা বাংলায় খোঁজা যায়।",
    },
  },
  {
    id: "2026-09-28-analytics-sales-match-your-orders",
    date: "2026-09-28",
    version: "4.122.0",
    tag: "fixed",
    href: "/analytics",
    title: {
      en: "Analytics sales now match your orders",
      bn: "অ্যানালিটিক্সের বিক্রি এখন আপনার অর্ডারের সাথে মেলে",
    },
    body: {
      en: "Sales, orders and parcels in Analytics are now counted from your orders themselves, by Bangladesh days. Sales are the products in confirmed orders after sale prices and coupons, delivery charges are shown apart, and a cancelled order no longer takes money off a later week.",
      bn: "অ্যানালিটিক্সে বিক্রি, অর্ডার আর পার্সেল এখন সরাসরি আপনার অর্ডার থেকে, বাংলাদেশের দিন ধরে গোনা হয়। বিক্রি মানে কনফার্ম করা অর্ডারের পণ্য, ছাড় আর কুপনের পরে; ডেলিভারি চার্জ আলাদা দেখানো হয়, আর বাতিল অর্ডার পরের কোনো সপ্তাহের হিসাব থেকে টাকা কাটে না।",
    },
  },
  {
    id: "2026-09-27-shoppers-message-you-from-contact",
    date: "2026-09-27",
    version: "4.121.0",
    tag: "new",
    href: "/support-tickets",
    title: {
      en: "Shoppers can message you from Contact",
      bn: "ক্রেতারা যোগাযোগ পেজ থেকে বার্তা পাঠাতে পারবেন",
    },
    body: {
      en: "Your shop's Contact page now has your details on one side and a message form on the other. Each message lands in Support tickets and is emailed to you. Turn Support tickets off in Settings, Apps, and the page shows just your details.",
      bn: "আপনার দোকানের যোগাযোগ পেজে এখন এক পাশে আপনার তথ্য আর অন্য পাশে বার্তা পাঠানোর ফর্ম। প্রতিটি বার্তা সাপোর্ট টিকেটে আসে এবং আপনাকে ইমেইল করা হয়। সেটিংস > অ্যাপস-এ সাপোর্ট টিকেট বন্ধ করলে পেজে শুধু আপনার তথ্য দেখাবে।",
    },
  },
  {
    id: "2026-09-27-your-popup-shows-again",
    date: "2026-09-27",
    version: "4.121.0",
    tag: "fixed",
    href: "/settings?tab=promotions",
    title: {
      en: "Your pop-up shows in your shop again",
      bn: "আপনার পপ-আপ আবার দোকানে দেখাচ্ছে",
    },
    body: {
      en: "The pop-up you set up in Settings, Promotions was not showing in the new shop. It shows again, after your delay and as often as you chose. Every picture you added can now be swiped through.",
      bn: "সেটিংস > প্রমোশনস-এ তৈরি করা পপ-আপ নতুন দোকানে দেখাচ্ছিল না। এখন আবার দেখাচ্ছে, আপনার ঠিক করা সময় পরে এবং আপনি যতবার চেয়েছেন ততবার। আপনার যোগ করা সব ছবি এখন সোয়াইপ করে দেখা যায়।",
    },
  },
  {
    id: "2026-09-27-plans-lose-the-request-limit",
    date: "2026-09-27",
    version: "4.120.0",
    tag: "improved",
    title: {
      en: "Plans list only what applies to your shop",
      bn: "প্ল্যানে শুধু আপনার দোকানের জন্য প্রযোজ্য বিষয়",
    },
    body: {
      en: "Plans no longer show “storefront requests per minute”. It was a limit of the old storefront, which is gone, so it no longer means anything for your shop.",
      bn: "প্ল্যানে আর “প্রতি মিনিটে স্টোরফ্রন্ট রিকোয়েস্ট” দেখানো হয় না। এটি পুরোনো স্টোরফ্রন্টের একটি সীমা ছিল, যা এখন আর নেই, তাই আপনার দোকানের জন্য এর আর কোনো মানে নেই।",
    },
  },
  {
    id: "2026-09-27-more-shoppers-in-abandoned-checkouts",
    date: "2026-09-27",
    version: "4.119.4",
    tag: "improved",
    href: "/orders/abandoned",
    title: {
      en: "More shoppers reach Abandoned checkouts",
      bn: "অসম্পূর্ণ চেকআউটে আরও বেশি ক্রেতা আসবেন",
    },
    body: {
      en: "A shopper who typed their phone number and then locked their phone, switched apps or closed the page was sometimes missed. They are now listed too, so you can call them, and a shopper who did buy is never listed there by mistake.",
      bn: "যে ক্রেতা ফোন নম্বর লিখে তারপর ফোন লক করতেন, অন্য অ্যাপে যেতেন বা পেজ বন্ধ করতেন, তাঁরা কখনো কখনো বাদ পড়ে যেতেন। এখন তাঁরাও তালিকায় আসবেন, তাই আপনি তাঁদের ফোন করতে পারবেন, আর যিনি কিনেছেন তিনি ভুল করে সেখানে আসবেন না।",
    },
  },
  {
    id: "2026-09-22-theme-editor-and-live-preview",
    date: "2026-09-22",
    version: "4.118.6",
    tag: "new",
    title: {
      en: "Design your store",
      bn: "নিজের মতো স্টোর সাজান",
    },
    body: {
      en: "In Settings → Customization, open the editor to see your real store as your shoppers will — on a phone or a computer, in your own fonts and colours — and click any part of it to change it in a calm panel beside it, where every part of the page is also listed with your colours, corners and product cards, and where you can always upload a new picture however many you have placed. The cart, checkout, wishlist and account pages are filled with a sample of your own products so you can see them full, nothing in that sample is saved, and a refresh keeps you on the page you were working on. What you change — your social links too, which moved here from Settings to the footer's Social links — stays hidden from your shoppers until you press Save to store, and customizing your store is part of the Premium plan.",
      bn: "সেটিংস → কাস্টমাইজেশন থেকে এডিটর খুললে আপনার আসল স্টোরটি দেখবেন, ঠিক যেমন ক্রেতারা দেখবেন — ফোনে বা কম্পিউটারে, আপনার নিজের ফন্ট ও রঙে — আর যেকোনো অংশে ক্লিক করে পাশের একটি শান্ত প্যানেলে তা বদলান, যেখানে পাতার প্রতিটি অংশের তালিকা আর আপনার রং, কোণ ও পণ্যের কার্ডও থাকে, আর যত ছবিই রাখুন, নতুন ছবি সবসময় আপলোড করতে পারবেন। কার্ট, চেকআউট, উইশলিস্ট আর অ্যাকাউন্ট পাতা আপনার নিজের পণ্যের একটি নমুনা দিয়ে ভরা থাকে, যাতে পুরো পাতাটি দেখতে পান, সেই নমুনার কিছুই সেভ হয় না, আর পাতা রিফ্রেশ করলেও আপনি যে পাতায় কাজ করছিলেন সেখানেই থাকেন। যা বদলান — সেটিংস থেকে এখানে ফুটারের সোশ্যাল লিংকে সরে আসা আপনার সোশ্যাল লিংকসহ — তা ক্রেতারা দেখেন না, স্টোরে সংরক্ষণ বাটনে চাপলেই তা স্টোরে যায়; স্টোর সাজানো প্রিমিয়াম প্ল্যানের অংশ।",
    },
    href: "/settings?tab=customization",
  },
];
