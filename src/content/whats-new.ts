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
    id: "2026-10-02-payments-your-own-bkash-and-nagad-numbers",
    date: "2026-10-02",
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
    id: "2026-10-02-everyone-greeted-by-their-own-name",
    date: "2026-10-02",
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
    id: "2026-10-02-a-welcoming-team-invite",
    date: "2026-10-02",
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
  {
    id: "2026-09-30-courier-logos-easy-to-see",
    date: "2026-09-30",
    version: "4.153.2",
    tag: "fixed",
    title: {
      en: "Courier logos are easy to see",
      bn: "কুরিয়ারের লোগো এখন সহজে দেখা যায়",
    },
    body: {
      en: "In the fraud check, each courier now shows as its logo on a white tile, so dark logos like SteadFast's show clearly in dark mode too.",
      bn: "ফ্রড চেকে এখন প্রতিটি কুরিয়ার তার লোগো দিয়ে সাদা ঘরে দেখায়, তাই SteadFast-এর মতো গাঢ় লোগোও ডার্ক মোডে পরিষ্কার দেখা যায়।",
    },
    href: "/orders",
  },
  {
    id: "2026-09-30-a-fraud-colour-on-every-order",
    date: "2026-09-30",
    version: "4.153.0",
    tag: "new",
    title: {
      en: "A fraud colour on every order",
      bn: "প্রতিটি অর্ডারে ফ্রড রঙ",
    },
    body: {
      en: "Every new order is checked on its own and shows a colour: green for a good buyer, yellow to be careful, red for risky, with the share of parcels delivered. Click it and the report opens at once: the customer's parcels at every courier, reports from other merchants, their history across Paperbase, what to do, and when it was checked. Use “Check again” for a fresh one.",
      bn: "প্রতিটি নতুন অর্ডার নিজে থেকেই যাচাই হয় আর একটি রঙ দেখায়: ভালো ক্রেতার জন্য সবুজ, সাবধান হওয়ার জন্য হলুদ, ঝুঁকিপূর্ণ হলে লাল, সাথে কত শতাংশ পার্সেল ডেলিভার হয়েছে। ক্লিক করলেই রিপোর্ট সাথে সাথে খোলে: সব কুরিয়ারে ক্রেতার পার্সেল, অন্য মার্চেন্টদের রিপোর্ট, Paperbase জুড়ে তাঁর হিসাব, কী করবেন, আর কখন যাচাই হয়েছিল। নতুন করে দেখতে “আবার যাচাই করুন” চাপুন।",
    },
    href: "/orders",
  },
  {
    id: "2026-09-30-shop-steady-while-it-updates",
    date: "2026-09-30",
    version: "4.152.2",
    tag: "fixed",
    title: {
      en: "Your shop stays steady while it updates",
      bn: "আপডেটের সময়ও আপনার দোকান স্থির থাকে",
    },
    body: {
      en: "We fixed a rare error that could appear when your shop restarts its internal workers, such as during an update.",
      bn: "আপনার দোকান যখন ভেতরের কাজগুলো নতুন করে চালু করে, যেমন আপডেটের সময়, তখন মাঝে মাঝে যে একটি ত্রুটি দেখা দিত তা ঠিক করা হয়েছে।",
    },
  },
  {
    id: "2026-09-30-a-new-search-box",
    date: "2026-09-30",
    version: "4.150.0",
    tag: "new",
    title: {
      en: "A new, smarter search",
      bn: "নতুন, আরও স্মার্ট সার্চ",
    },
    body: {
      en: "Search now finds pages, settings and actions like “add product”, plus categories, brands, discount codes, blog posts, reviews and team members, and answers faster. It finds a phone however it's written and a product without its dash (“tshirt”). Use the arrow keys and Enter; your recent searches wait for you.",
      bn: "সার্চে এখন পেজ, সেটিংস আর “add product”-এর মতো কাজ, সাথে ক্যাটাগরি, ব্র্যান্ড, ডিসকাউন্ট কোড, ব্লগ পোস্ট, রিভিউ ও টিম মেম্বারও পাওয়া যায়, আর উত্তর আসে আরও দ্রুত। ফোন নম্বর যেভাবেই লিখুন খুঁজে পায়, প্রোডাক্টের নাম ড্যাশ ছাড়া লিখলেও (“tshirt”)। অ্যারো কী আর Enter ব্যবহার করুন; আপনার সাম্প্রতিক খোঁজগুলো সেখানেই থাকবে।",
    },
  },
  {
    id: "2026-09-29-search-follows-each-members-access",
    date: "2026-09-29",
    version: "4.146.2",
    tag: "fixed",
    title: {
      en: "Search follows each team member's access",
      bn: "সার্চ এখন প্রত্যেক টিম মেম্বারের অনুমতি মেনে চলে",
    },
    body: {
      en: "The dashboard's search now shows each team member only the products, orders, customers and support tickets their role and categories let them open. It also keeps up with you while you type.",
      bn: "ড্যাশবোর্ডের সার্চ এখন প্রত্যেক টিম মেম্বারকে শুধু সেই প্রোডাক্ট, অর্ডার, কাস্টমার আর সাপোর্ট টিকিট দেখায়, যেগুলো তাঁর রোল আর ক্যাটাগরি অনুযায়ী খোলার অনুমতি আছে। টাইপ করার সময়ও এখন সার্চ থেমে যায় না।",
    },
  },
  {
    id: "2026-09-29-sign-in-photos-on-phones",
    date: "2026-09-29",
    version: "4.146.1",
    tag: "fixed",
    title: {
      en: "The sign-in page looks right on phones",
      bn: "ফোনে সাইন-ইন পেজ ঠিকঠাক দেখায়",
    },
    body: {
      en: "On a phone, the shop photos behind sign in and sign up now show clearly at the top of the screen, and the language switch no longer covers the heading.",
      bn: "ফোনে সাইন ইন আর অ্যাকাউন্ট খোলার পেজের পেছনের দোকানের ছবিগুলো এখন স্ক্রিনের ওপরে পরিষ্কার দেখা যায়, আর ভাষা বদলানোর বোতাম আর শিরোনাম ঢেকে দেয় না।",
    },
  },
  {
    id: "2026-09-29-quick-right-after-you-save",
    date: "2026-09-29",
    version: "4.146.0",
    tag: "improved",
    title: {
      en: "Your shop stays quick right after you save",
      bn: "সেভ করার ঠিক পরেও দোকান দ্রুত থাকে",
    },
    body: {
      en: "Saving a change refreshes your shop's pages. Now each page is rebuilt once, and shoppers arriving at that same moment all get it, so your shop stays quick even when you save during a busy hour.",
      bn: "কোনো পরিবর্তন সেভ করলে দোকানের পাতাগুলো নতুন করে তৈরি হয়। এখন প্রতিটি পাতা একবারই তৈরি হয়, আর ঠিক সেই সময়ে আসা সব ক্রেতা সেটিই পান, তাই ব্যস্ত সময়ে সেভ করলেও আপনার দোকান দ্রুত থাকে।",
    },
  },
  {
    id: "2026-09-29-timed-sections-on-time",
    date: "2026-09-29",
    version: "4.145.0",
    tag: "improved",
    title: {
      en: "Timed sections start right on time",
      bn: "সময় ঠিক করা সেকশন ঠিক সময়েই শুরু হয়",
    },
    body: {
      en: "A section you schedule in the editor now appears the second it starts and goes the second it ends; it used to be up to a minute late. Your shop also keeps more of its pages ready, so it opens faster for your shoppers.",
      bn: "এডিটরে যে সেকশনের সময় ঠিক করেন, সেটি এখন শুরুর সেকেন্ডেই দেখা যায় আর শেষের সেকেন্ডেই সরে যায়; আগে এক মিনিট পর্যন্ত দেরি হতো। আপনার দোকান এখন আরও বেশি পাতা তৈরি রাখে, তাই ক্রেতাদের জন্য আরও দ্রুত খোলে।",
    },
  },
  {
    id: "2026-09-29-edits-show-at-once",
    date: "2026-09-29",
    version: "4.144.0",
    tag: "improved",
    title: {
      en: "Your edits show in your shop at once",
      bn: "আপনার পরিবর্তন সঙ্গে সঙ্গে দোকানে দেখা যায়",
    },
    body: {
      en: "A new price, picture, category, delivery charge or shop detail now shows in your shop the moment you save it; some used to take up to five minutes. And if part of our system slows down, your shop keeps selling, just a little slower.",
      bn: "নতুন দাম, ছবি, ক্যাটাগরি, ডেলিভারি চার্জ বা দোকানের তথ্য এখন সেভ করার সঙ্গে সঙ্গেই আপনার দোকানে দেখা যায়; আগে কিছু পরিবর্তন দেখাতে পাঁচ মিনিট পর্যন্ত লাগত। আর আমাদের সিস্টেমের কোনো অংশ ধীর হয়ে গেলেও আপনার দোকানে বিক্রি চলতে থাকে, শুধু একটু ধীরে।",
    },
  },
  {
    id: "2026-09-29-order-work-kept-apart",
    date: "2026-09-29",
    version: "4.143.0",
    tag: "improved",
    title: {
      en: "Order work kept apart from saved pages",
      bn: "অর্ডারের কাজ এখন সেভ করা পাতা থেকে আলাদা",
    },
    body: {
      en: "The copies of your shop's pages we keep so it opens fast now live apart from your order work. However many we keep, they can no longer crowd out orders, emails or courier sends being processed.",
      bn: "আপনার দোকান দ্রুত খোলার জন্য আমরা পাতার যে কপি রাখি, সেগুলো এখন আপনার অর্ডারের কাজ থেকে আলাদা জায়গায় থাকে। যত কপিই রাখা হোক, সেগুলো আর অর্ডার, ইমেইল বা কুরিয়ারে পাঠানোর কাজে বাধা দিতে পারে না।",
    },
  },
  {
    id: "2026-09-29-see-who-is-signed-in",
    date: "2026-09-29",
    version: "4.142.0",
    tag: "new",
    href: "/settings?tab=sessions",
    title: {
      en: "See who is signed in to your shop",
      bn: "দেখুন কে আপনার দোকানে সাইন ইন করা",
    },
    body: {
      en: "Settings, Sessions shows everyone signed in right now: you on each device, your team, and Paperbase support on a visit, with where and on what. End any of them with one tap, and look back over every sign-in of the last 90 days. Only you, the owner, can see it.",
      bn: "সেটিংস > সেশনে দেখুন এই মুহূর্তে কে কে সাইন ইন করা: প্রতিটি ডিভাইসে আপনি, আপনার টিম, আর ভিজিটে থাকা Paperbase সাপোর্ট, কোথা থেকে আর কোন ডিভাইসে। এক ট্যাপে যেকোনোটি শেষ করুন, আর গত ৯০ দিনের প্রতিটি সাইন-ইন দেখুন। এটি শুধু আপনি, মালিক, দেখতে পান।",
    },
  },
  {
    id: "2026-09-29-support-can-help-inside-your-dashboard",
    date: "2026-09-29",
    version: "4.141.0",
    tag: "new",
    href: "/activities",
    title: {
      en: "Our support team can help inside your dashboard",
      bn: "আমাদের সাপোর্ট টিম আপনার ড্যাশবোর্ডেই সাহায্য করতে পারে",
    },
    body: {
      en: "When you ask Paperbase for help, our team can open your dashboard for up to an hour to fix things with you. Every visit shows in Activities, every change they make is marked, and your account, passkeys, payments and team stay yours alone.",
      bn: "Paperbase-এর কাছে সাহায্য চাইলে আমাদের টিম সর্বোচ্চ এক ঘণ্টার জন্য আপনার ড্যাশবোর্ড খুলে সমস্যা ঠিক করে দিতে পারে। প্রতিটি ভিজিট অ্যাক্টিভিটিতে দেখা যায়, তাদের করা প্রতিটি পরিবর্তন চিহ্নিত থাকে, আর আপনার অ্যাকাউন্ট, পাসকি, পেমেন্ট ও টিম শুধু আপনারই থাকে।",
    },
  },
  {
    id: "2026-09-29-setup-is-clear-about-your-web-address",
    date: "2026-09-29",
    version: "4.140.0",
    tag: "improved",
    title: {
      en: "Setup is clear about your web address",
      bn: "সেট-আপে ওয়েব ঠিকানা নিয়ে কোনো বিভ্রান্তি নেই",
    },
    body: {
      en: "Your shop is live on its free Paperbase address as soon as setup ends. Connecting a domain you own can wait: setup now says so, and its last screen shows where to connect one in Settings.",
      bn: "সেট-আপ শেষ হতেই আপনার দোকান ফ্রি Paperbase ঠিকানায় চালু হয়ে যায়। নিজের ডোমেইন পরে যুক্ত করলেও চলে: সেট-আপ এখন সেটা স্পষ্ট বলে, আর শেষ পাতায় দেখায় সেটিংসে কোথায় যুক্ত করবেন।",
    },
  },
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
];
