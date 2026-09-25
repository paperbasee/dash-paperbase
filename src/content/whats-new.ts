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
 * had stopped loading.)
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
    id: "2026-09-22-integrations-cards",
    date: "2026-09-22",
    version: "4.102.0",
    tag: "improved",
    href: "/settings?tab=integrations",
    title: {
      en: "Integrations get a new look",
      bn: "ইন্টিগ্রেশনের নতুন চেহারা",
    },
    body: {
      en: "Settings → Integrations now shows a card for each service — Meta, TikTok and Steadfast — with one switch that turns the whole service off or on, after a warning. Open a card to see every pixel or account inside it, each with its own switch, and to change a pixel's ID, token or test code without disconnecting it. Google Analytics and more couriers are listed as coming soon, and the Steadfast setup steps are now in Bangla too.",
      bn: "সেটিংস → ইন্টিগ্রেশনে এখন প্রতিটি সেবার — Meta, TikTok ও স্টেডফাস্ট — আলাদা কার্ড আছে, যার একটি সুইচ সতর্কবার্তার পর পুরো সেবাটি বন্ধ বা চালু করে। কার্ড খুললে ভেতরের প্রতিটি পিক্সেল বা অ্যাকাউন্ট তার নিজের সুইচসহ দেখা যায়, আর বিচ্ছিন্ন না করেই পিক্সেলের আইডি, টোকেন বা টেস্ট কোড বদলানো যায়। Google Analytics ও আরও কুরিয়ার “শিগগিরই আসছে” হিসেবে দেখানো আছে, আর স্টেডফাস্ট সেটআপের ধাপগুলো এখন বাংলাতেও।",
    },
  },
  {
    id: "2026-09-22-when-a-sale-counts",
    date: "2026-09-22",
    version: "4.101.0",
    tag: "new",
    href: "/settings?tab=integrations",
    title: {
      en: "Choose when a sale counts for your ads",
      bn: "বিজ্ঞাপনে কখন বিক্রি গোনা হবে, আপনিই ঠিক করুন",
    },
    body: {
      en: "In Settings → Integrations you can now choose when a cash on delivery order counts as a sale on Meta and TikTok: as soon as it is placed, or only once you confirm it, so fake and refused orders stop teaching your ads the wrong buyers. bKash and Nagad orders always count when the customer submits the payment. The four event switches on each connection — Purchase, Initiate checkout, Add to cart and View content — now really turn those events on and off, and all four start switched on.",
      bn: "সেটিংস → ইন্টিগ্রেশনে এখন ঠিক করতে পারবেন ক্যাশ অন ডেলিভারি অর্ডার Meta ও TikTok-এ কখন বিক্রি হিসেবে গোনা হবে: অর্ডার দেওয়ার সাথে সাথে, নাকি আপনি নিশ্চিত করলে — যাতে ভুয়া ও ফেরত হওয়া অর্ডার আপনার বিজ্ঞাপনকে ভুল ক্রেতা খুঁজতে না শেখায়। বিকাশ ও নগদ অর্ডার সবসময় ক্রেতা পেমেন্ট জমা দিলে গোনা হয়। প্রতিটি কানেকশনের চারটি ইভেন্ট সুইচ — ক্রয়, চেকআউট শুরু, কার্টে যোগ করা আর কনটেন্ট দেখা — এখন সত্যিই সেই ইভেন্টগুলো চালু ও বন্ধ করে, আর চারটিই চালু অবস্থায় শুরু হয়।",
    },
  },
  {
    id: "2026-09-22-payment-submitted-in-orders",
    date: "2026-09-22",
    version: "4.99.2",
    tag: "improved",
    href: "/orders",
    title: {
      en: "See which payments are waiting for you",
      bn: "কোন পেমেন্ট আপনার যাচাইয়ের অপেক্ষায়, দেখুন",
    },
    body: {
      en: "An order paid in advance by bKash or Nagad said Payment pending both before and after the customer sent the money. Now it says Payment submitted, in blue, once they have sent it and typed in the transaction ID, so you can see at a glance which orders are waiting for you to check. When you verify it, it says Confirmed as before — and the Verify payment card now says whether the money was sent by bKash or Nagad, so you check the right app.",
      bn: "বিকাশ বা নগদে আগে পেমেন্টের অর্ডার ক্রেতা টাকা পাঠানোর আগে ও পরে — দুই সময়েই “পেমেন্ট মুলতুবি” দেখাত। এখন ক্রেতা টাকা পাঠিয়ে ট্রানজেকশন আইডি দিলে নীল রঙে “পেমেন্ট জমা হয়েছে” দেখায়, তাই কোন অর্ডারগুলো আপনার যাচাইয়ের অপেক্ষায় আছে তা এক নজরেই বোঝা যায়। পেমেন্ট যাচাই করলে আগের মতোই “নিশ্চিত” দেখাবে — আর যাচাইয়ের কার্ডে এখন লেখা থাকে টাকা বিকাশে নাকি নগদে পাঠানো হয়েছে, যাতে আপনি সঠিক অ্যাপে মিলিয়ে দেখতে পারেন।",
    },
  },

  {
    id: "2026-09-22-product-page-choices",
    date: "2026-09-22",
    version: "4.99.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your product pages",
      bn: "পণ্যের পেজ নিজের মতো সাজান",
    },
    body: {
      en: "Under Product in your editor, every choice is real now: show the path back up or hide it, pick how the pictures look — a frame with thumbnails, a column, or just one — and switch reviews (the full band or just the score), \"You may also like\", product questions and the recently-viewed strip on or off. The buying column now ends in fold-out rows with icons: Product details with its specifications inside, your Shipping details and Exchange policy written once for every product, and rows of your own such as Wash & Care — a row with nothing written is not shown. On a phone, a bar with the price and the button follows the shopper down the page, and the product code shows once, right under the product's name.",
      bn: "এডিটরের পণ্য অংশে প্রতিটি পছন্দ এখন সত্যিকারের: উপরে ফেরার পথ দেখাবেন কি না; ছবি কেমন দেখাবে — থাম্বনেইলসহ একটি ছবি, ছবির কলাম, নাকি শুধু একটি; আর রিভিউ (পুরো ব্যান্ড বা শুধু স্কোর), “এগুলোও ভালো লাগতে পারে”, পণ্যের প্রশ্ন ও “সম্প্রতি দেখা” চালু বা বন্ধ করা যায়। কেনার অংশ এখন আইকনসহ ভাঁজ করা সারিতে শেষ হয়: স্পেসিফিকেশনসহ পণ্যের বিবরণ, একবার লিখে দেওয়া আপনার শিপিং তথ্য ও এক্সচেঞ্জ নীতি, আর ধোয়া ও যত্নের মতো আপনার নিজের সারি — লেখা না থাকলে সারিটি দেখানো হয় না। ফোনে পণ্যের পাতায় দাম আর বোতামসহ একটি বার ক্রেতার সাথে নিচে নামে, আর পণ্যের কোড একবারই দেখায় — পণ্যের নামের ঠিক নিচে।",
    },
  },
  {
    id: "2026-09-22-search-page-choices",
    date: "2026-09-22",
    version: "4.98.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "A better search, and a page you design",
      bn: "আরও ভালো সার্চ, আর নিজের মতো সার্চ পেজ",
    },
    body: {
      en: "Choose whether the results heading says how many were found, whether matching categories sit above the products, and how many products go across. A long answer can now reach past the first 48 with a Load more button or numbered pages, a search that finds nothing can offer your categories as a way on, and an empty search box can show your best sellers instead of a line of help. Search itself got better too: the search box opens a full-screen search that answers as a shopper types, and half a word, a plural or a misspelling now finds what they meant — “shrit” shows your shirts, and says so.",
      bn: "ফলাফলের শিরোনামে কয়টি পাওয়া গেল তা দেখাবেন কি না, পণ্যের উপরে মিলে যাওয়া ক্যাটাগরি থাকবে কি না, আর একসারিতে কয়টি পণ্য — ঠিক করুন। লম্বা উত্তরে এখন প্রথম ৪৮টির পরেও যাওয়া যায় “আরও দেখুন” বোতাম বা নম্বর দেওয়া পাতায়, কিছু না মিললে আপনার ক্যাটাগরিগুলো এগোনোর পথ হিসেবে দেখানো যায়, আর খালি সার্চ বক্সে সাহায্যের লাইনের বদলে আপনার সবচেয়ে বেশি বিক্রি হওয়া পণ্য দেখানো যায়। সার্চ নিজেও ভালো হয়েছে: সার্চ বক্সে চাপলে পুরো স্ক্রিন জুড়ে সার্চ খোলে, ক্রেতা লিখতে লিখতেই ফলাফল চলে আসে, আর অর্ধেক শব্দ, বহুবচন বা ভুল বানানে লিখলেও এখন তাঁরা যা খুঁজছেন তা পাওয়া যায় — “শারি” লিখলে শাড়ি দেখায়, আর তা জানিয়েও দেয়।",
    },
  },
  {
    id: "2026-09-22-header-and-footer-choices",
    date: "2026-09-22",
    version: "4.97.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your header and footer",
      bn: "হেডার আর ফুটার সাজান",
    },
    body: {
      en: "Arrange your header as a bar with every category under it, with your name centred over five of them, or with the categories behind a menu button as on a phone — and show search as a box or a small mark, keep the header on screen as shoppers scroll, and add account and wishlist beside the cart. Arrange your footer in columns, with your shop on one side, centred, or as a single short line, and choose what it shows: your address and phone or only your email, your social links as names or round marks, the ways you take payment, and your policy pages beside the year.",
      bn: "হেডার সাজান নিচে সব ক্যাটাগরিসহ একটি বার হিসেবে, পাঁচটি ক্যাটাগরির উপরে মাঝখানে নাম রেখে, নয়তো ফোনের মতো একটি মেনু বোতামের পেছনে ক্যাটাগরি রেখে — আর সার্চ দেখান বক্সে বা ছোট চিহ্নে, ক্রেতা স্ক্রল করলেও হেডার স্ক্রিনে রাখুন, আর কার্টের পাশে অ্যাকাউন্ট ও উইশলিস্ট যোগ করুন। ফুটার সাজান কলামে, একপাশে দোকান রেখে, মাঝখানে, নয়তো ছোট এক লাইনে, আর ঠিক করুন কী দেখাবে: ঠিকানা ও ফোন নাকি শুধু ইমেইল, সোশ্যাল লিংক নামে বা গোল চিহ্নে, আপনি যেভাবে টাকা নেন, আর সালের পাশে নীতিমালার পেজগুলো।",
    },
  },
  {
    id: "2026-09-22-home-page-rows",
    date: "2026-09-22",
    version: "4.95.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "New rows for your home page",
      bn: "হোম পেজের নতুন সারি",
    },
    body: {
      en: "Your home page shows three categories you tick, each with everything inside it, instead of a row for every category you have — and a button under them opens every product you sell on a page of its own. You can also show a row of products you choose, your best sellers and your newest, the last two filling themselves. Further down, add your brands, your newest good reviews on Premium, your three newest blog posts, a button that opens WhatsApp to your number, and questions you answer once — each kept up to date from your shop.",
      bn: "হোম পেজে এখন আপনার প্রতিটি ক্যাটাগরির সারির বদলে আপনার টিক করা তিনটি ক্যাটাগরি, ভেতরের সব পণ্যসহ — আর নিচের একটি বোতাম আপনার সব পণ্য নিয়ে আলাদা পাতা খোলে। আপনার বেছে নেওয়া পণ্য, সবচেয়ে বেশি বিক্রি হওয়া পণ্য আর নতুন পণ্যের সারিও দেখাতে পারেন, শেষের দুটি নিজেই ভরে যায়। আরও নিচে যোগ করুন আপনার ব্র্যান্ড, প্রিমিয়ামে আপনার সর্বশেষ ভালো রিভিউ, ব্লগের নতুন তিনটি পোস্ট, আপনার নম্বরে হোয়াটসঅ্যাপ খোলার একটি বোতাম, আর একবার উত্তর দেওয়া প্রশ্নগুলো — সবই আপনার দোকান থেকে নিজে নিজে হালনাগাদ থাকে।",
    },
  },
  {
    id: "2026-09-22-blog-choices",
    date: "2026-09-22",
    version: "4.94.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your blog and its posts",
      bn: "ব্লগ আর তার পোস্ট সাজান",
    },
    body: {
      en: "Give your blog its own name and opening line, let readers narrow the posts by typing or by tag, and choose how the featured posts, the rest and each card look — with the date or how many times a post has been read underneath, and every read counts now. On each post, choose where its picture goes, whether the writer's name sits beside the date, how wide the words run, and whether readers see its tags, the posts before and after it, and three more to read. You can also add a few words of your own under the posts, and posts written as plain text now keep their paragraphs.",
      bn: "ব্লগকে নিজের নাম আর প্রথম লাইন দিন, পাঠক যেন লিখে বা ট্যাগ বেছে পোস্টগুলো ছেঁকে নিতে পারেন, আর বাছাই করা পোস্ট, বাকি পোস্ট ও প্রতিটি কার্ড কেমন দেখাবে তা ঠিক করুন — নিচে তারিখ, নয়তো পোস্টটি কতবার পড়া হয়েছে; এখন প্রতিবার পড়াই গোনা হয়। প্রতিটি পোস্টে ছবি কোথায় বসবে, তারিখের পাশে লেখকের নাম থাকবে কি না, লেখা কতটা চওড়া হবে, আর পাঠক ট্যাগ, আগের ও পরের পোস্ট এবং পড়ার মতো আরও তিনটি পোস্ট দেখবেন কি না — ঠিক করুন। পোস্টের নিচে নিজের কিছু কথাও যোগ করতে পারেন, আর সাধারণ লেখায় লেখা পোস্টে এখন অনুচ্ছেদগুলো ঠিক থাকে।",
    },
  },
  {
    id: "2026-09-22-wishlist-page-choices",
    date: "2026-09-22",
    version: "4.90.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your wishlist page",
      bn: "উইশলিস্ট পেজ সাজান",
    },
    body: {
      en: "Show how many things are saved beside the title or just the word, lay them out as a grid of cards or as a compact list that fits more on a screen, and say something inviting when nothing is saved yet — which is the version of the page most people meet. You can also decide whether a saved thing can be bought straight from the list or only opened, which is the one choice here that changes what the page is for.",
      bn: "শিরোনামের পাশে কয়টি সংরক্ষিত আছে দেখাবেন নাকি শুধু শব্দটি, পণ্যগুলো কার্ডের গ্রিডে নাকি ছোট তালিকায় — যাতে একসাথে বেশি দেখা যায় — আর কিছু সংরক্ষিত না থাকলে আমন্ত্রণমূলক কিছু বলা, যেটি বেশিরভাগ মানুষ দেখেন। সংরক্ষিত পণ্যটি তালিকা থেকেই কেনা যাবে নাকি শুধু খোলা যাবে, সেটিও ঠিক করতে পারেন — এই পাতার একমাত্র সিদ্ধান্ত যা পাতাটির উদ্দেশ্যই বদলে দেয়।",
    },
  },
  {
    id: "2026-09-22-account-page-choices",
    date: "2026-09-22",
    version: "4.88.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your customers' account page",
      bn: "ক্রেতার অ্যাকাউন্ট পেজ সাজান",
    },
    body: {
      en: "Greet them by name, by the plain word, or not at all; list their orders as a list or as cards with the pictures of what was in each one; and send an empty account to your shop rather than to nothing. You can also choose whether they see the reviews they have written — every one, including the ones waiting for you and the ones you turned down, theirs to change or delete. That last one is on to begin with, because a review its author cannot find looks lost, and they simply write it again.",
      bn: "নাম ধরে, শুধু শব্দটি দিয়ে, নাকি কোনো অভ্যর্থনাই নয় — আপনার পছন্দ; তাঁদের অর্ডার তালিকা হিসেবে নাকি ভিতরে কী ছিল তার ছবিসহ কার্ড হিসেবে; আর খালি অ্যাকাউন্ট থেকে শূন্যতার বদলে দোকানে পাঠানো। তাঁরা নিজেদের লেখা রিভিউ দেখতে পাবেন কি না, সেটিও ঠিক করতে পারেন — সবগুলোই, আপনার অপেক্ষায় থাকা আর ফিরিয়ে দেওয়াগুলোসহ, নিজেরাই বদলাতে বা মুছতে পারেন। শেষেরটি শুরু থেকেই চালু, কারণ যে রিভিউ তার লেখকই খুঁজে পান না তা হারিয়ে গেছে মনে হয়, আর তিনি আবার লেখেন।",
    },
  },
  {
    id: "2026-09-22-checkout-page-shell",
    date: "2026-09-22",
    version: "4.86.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your checkout page",
      bn: "চেকআউট পেজ নিজের মতো সাজান",
    },
    body: {
      en: "The Checkout page in your editor is real now: keep the full header or strip it to your shop's name, end the page with your policy links, the whole footer or nothing, and set the order beside the form with the discount code box, the ways to pay, a Cart · Checkout · Done bar and your promises. The short or long customer form is chosen there too, where you can see it — it moved from Settings → Checkout, is saved when you press Save to store, and the short form is now really short: name, phone, district and area. You can also write a line of your own to be read in the second before someone pays.",
      bn: "এডিটরের চেকআউট পেজটি এখন সত্যিকারের: পুরো হেডার রাখুন নাকি শুধু দোকানের নাম, পেজের শেষে নীতিমালার লিংক, পুরো ফুটার নাকি কিছুই না, আর অর্ডারটি ফর্মের পাশে — সাথে ডিসকাউন্ট কোডের ঘর, টাকা দেওয়ার উপায়, “কার্ট · চেকআউট · সম্পন্ন” বার আর আপনার প্রতিশ্রুতিগুলো। ক্রেতার ছোট নাকি বড় ফর্ম — সেটিও এখন সেখানেই, দেখতে দেখতে ঠিক করা যায়: সেটিংস → চেকআউট থেকে সরে এসেছে, “স্টোরে সংরক্ষণ” চাপলে সংরক্ষিত হয়, আর ছোট ফর্মটি এখন সত্যিই ছোট — নাম, ফোন, জেলা ও থানা। টাকা দেওয়ার ঠিক আগের মুহূর্তে পড়ার জন্য নিজের এক লাইনও লিখতে পারেন।",
    },
  },
  {
    id: "2026-09-22-cart-page-choices",
    date: "2026-09-22",
    version: "4.80.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your cart page",
      bn: "কার্ট পেজ নিজের মতো সাজান",
    },
    body: {
      en: "The Cart page in your editor is real now: a \"Continue shopping\" link beside the title or not, the items as cards or as a table, the total line by line or as one number, and an empty cart that says one line or invites the shopper somewhere. The items fill their own column with a picture on every line, and everything owed sits in one panel beside them — the discount code box inside it, behind a link if you would rather, with the ways they can pay underneath. You can also add a row of things to buy alongside, repeat your home-page promises or write a line of your own, show what the shopper looked at earlier, and put a Cart · Checkout · Done bar at the top.",
      bn: "এডিটরের কার্ট পেজটি এখন সত্যিকারের: শিরোনামের পাশে “আরও কিনুন” থাকবে কি না, পণ্যগুলো কার্ড হিসেবে নাকি টেবিলে, মোট ধাপে ধাপে নাকি একটিই সংখ্যা, আর কার্ট খালি থাকলে এক লাইন নাকি আমন্ত্রণ। পণ্যগুলো নিজের কলামে বসে, প্রতিটি লাইনে ছবিসহ, আর ক্রেতার দেয় সবকিছু পাশে একটি প্যানেলে — ডিসকাউন্ট কোডের ঘর সেটির ভিতরেই, চাইলে লিংকের পিছনে, নিচে টাকা দেওয়ার উপায়গুলো। সাথে কেনার মতো পণ্যের সারিও দিতে পারেন, হোম পেজের প্রতিশ্রুতি বা নিজের এক লাইন, ক্রেতা আগে যা দেখেছেন তা, আর উপরে “কার্ট · চেকআউট · সম্পন্ন” বার।",
    },
  },
  {
    id: "2026-09-22-category-pages-are-yours",
    date: "2026-09-22",
    version: "4.71.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Design your category pages",
      bn: "ক্যাটাগরি পেজ নিজের মতো সাজান",
    },
    body: {
      en: "The Category page in your editor is real now: the path back up, three shapes for the heading, the product count, two, three or four across, and what an empty category says. Shoppers can sort it — newest, price, name — and narrow it by the brands, sizes and colours that category actually has, either from a panel that slides in over the page or a rail beside the grid. A long category can end in numbered pages or a Load more button that keeps the shopper where they are.",
      bn: "এডিটরের ক্যাটাগরি পেজটি এখন সত্যিকারের: উপরে ফেরার পথ, শিরোনামের তিন রকম চেহারা, পণ্যের সংখ্যা, সারিতে দুই-তিন-চারটি, আর ক্যাটাগরি খালি থাকলে কী লেখা থাকবে। ক্রেতারা সাজিয়ে নিতে পারেন — নতুন, দাম, নাম — আর ওই ক্যাটাগরিতে সত্যিই আছে এমন ব্র্যান্ড, মাপ ও রঙ দিয়ে ছেঁকে নিতে পারেন, পাশ থেকে ভেসে ওঠা প্যানেলে নয়তো গ্রিডের পাশের সারিতে। লম্বা ক্যাটাগরি শেষ হতে পারে নম্বর দেওয়া পাতায়, নয়তো “আরও দেখুন” বোতামে যা ক্রেতাকে যেখানে আছেন সেখানেই রাখে।",
    },
  },
  {
    id: "2026-09-22-corners-are-yours",
    date: "2026-09-22",
    version: "4.67.0",
    tag: "new",
    href: "/settings?tab=customization",
    title: {
      en: "Your cards and corners, in the editor",
      bn: "কার্ড আর কোণা, এখন এডিটরে",
    },
    body: {
      en: "Choose square, soft or rounded corners for everything your shop draws a box around — cards, buttons, boxes you type in, pictures. Choosing Classic or Shelf product cards moved there too, out of Settings where it changed your shop the moment you clicked. Both sit in Customization under Style, and reach shoppers when you press Save to store.",
      bn: "দোকানে যেখানে যেখানে বাক্স আঁকা হয় — কার্ড, বোতাম, লেখার ঘর, ছবি — সবখানের কোণা চোকো, হালকা গোল নাকি গোল হবে, বেছে নিন। ক্ল্যাসিক না শেলফ প্রোডাক্ট কার্ড — এই পছন্দটিও সেটিংস থেকে সেখানে এসেছে, যেখানে চাপ দেওয়ামাত্রই দোকান বদলে যেত। দুটোই কাস্টমাইজেশনের স্টাইল অংশে, আর স্টোরে সংরক্ষণ চাপলেই ক্রেতাদের কাছে যাবে।",
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
      en: "Changing them meant asking us: the Banners screen had gone and nothing replaced it. They are in Customization now — click the big picture on your home page and you can add up to five, order them, choose where a tap goes, and set how long each one stays. Your shop shows exactly the pictures it showed yesterday, and pictures placed in Customization that had stopped loading, keeping Customization from opening, show again with nothing you arranged changed.",
      bn: "এগুলো বদলাতে আমাদের বলতে হতো: ব্যানার পাতাটি উঠে গিয়েছিল আর তার বদলে কিছু আসেনি। এখন সেগুলো কাস্টমাইজেশনে — হোম পেজের বড় ছবিতে চাপ দিলে পাঁচটি পর্যন্ত ছবি যোগ করা যাবে, ক্রম বদলানো যাবে, চাপ দিলে কোথায় যাবে তা ঠিক করা যাবে, আর প্রতিটি ছবি কত সময় থাকবে তাও। গতকাল যে ছবিগুলো ছিল ঠিক সেগুলোই দেখাচ্ছে, আর কাস্টমাইজেশনে বসানো যে ছবিগুলো লোড হওয়া বন্ধ হয়ে গিয়েছিল — যার ফলে কাস্টমাইজেশনও খুলত না — সেগুলো আবার দেখা যাচ্ছে, আপনার সাজানো কিছুই না বদলে।",
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
      en: "A signed-in customer can give a product stars, a few words and up to two photos, and nothing appears on your shop until you approve it in the new Reviews tab — the sidebar shows how many are waiting, and each one reaches your notifications too. You can approve, reject, reply, delete, or add one yourself from a screenshot — which is marked, so shoppers can tell. Anyone can read your reviews signed in or not, someone who actually received the item is marked a verified buyer, and a customer who edits their own sends it back to you for approval.",
      bn: "সাইন-ইন করা ক্রেতা পণ্যে স্টার, কয়েক লাইন লেখা আর সর্বোচ্চ দুটি ছবি দিতে পারবেন, আর নতুন রিভিউ ট্যাবে আপনি অনুমোদন না করা পর্যন্ত দোকানে কিছুই দেখা যাবে না — কতগুলো অপেক্ষায় আছে তা সাইডবারেই দেখা যায়, আর প্রতিটি আপনার নোটিফিকেশনেও আসে। অনুমোদন, বাতিল, উত্তর, মুছে ফেলা — সবই আপনার হাতে, আর স্ক্রিনশট থেকে নিজেও একটি যোগ করতে পারবেন, যেটি আলাদা করে চিহ্নিত থাকে। রিভিউ সবাই পড়তে পারবেন, যিনি সত্যিই পণ্যটি পেয়েছেন তাঁকে যাচাই করা ক্রেতা হিসেবে দেখানো হয়, আর কোনো ক্রেতা নিজের রিভিউ বদলালে সেটি আবার আপনার অনুমোদনের জন্য ফিরে আসে।",
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
      en: "On Premium, your home page can open with a video instead of pictures: paste a link from YouTube, Facebook or Vimeo — any normal link works, including a Shorts or a share link. Shoppers see your cover picture and a play button, and nothing is loaded from YouTube until somebody presses it, so the page stays fast and no shopper is reported to anyone who never watched. Reels and other tall videos have a shape of their own so they are not squeezed into a wide box.",
      bn: "প্রিমিয়ামে আপনার হোম পেজ ছবির বদলে একটি ভিডিও দিয়ে শুরু হতে পারে: ইউটিউব, ফেসবুক বা ভিমিও থেকে একটি লিংক বসান — শর্টস বা শেয়ার লিংকসহ সাধারণ যেকোনো লিংকই চলবে। ক্রেতারা আপনার কভার ছবি আর একটি প্লে বোতাম দেখবেন, আর কেউ সেটি না চাপা পর্যন্ত ইউটিউব থেকে কিছুই লোড হয় না — তাই পাতা দ্রুত থাকে আর যে ক্রেতা ভিডিও দেখেননি তাঁর কথা কোথাও যায় না। রিলসের মতো লম্বা ভিডিওর জন্য আলাদা আকার আছে, তাই সেগুলো চওড়া বাক্সে চেপে বসে না।",
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
    id: "2026-09-22-theme-editor-and-live-preview",
    date: "2026-09-22",
    version: "4.12.0",
    tag: "new",
    title: {
      en: "Design your store",
      bn: "নিজের মতো স্টোর সাজান",
    },
    body: {
      en: "In Settings → Customization you can now open a full screen editor, where you change each page's text, links and parts while your store updates beside you. What you change stays a draft your shoppers can't see until you press Save to store. Customizing your store is part of the Premium plan.",
      bn: "সেটিংস → কাস্টমাইজেশন থেকে এখন পুরো স্ক্রিনের এডিটর খুলতে পারবেন, যেখানে প্রতিটি পেজের লেখা, লিংক আর অংশগুলো বদলাবেন আর পাশেই আপনার স্টোর বদলাতে দেখবেন। যা বদলান তা ড্রাফট হয়ে থাকে, ক্রেতারা দেখেন না; স্টোরে সংরক্ষণ বাটনে চাপলেই তা স্টোরে যায়। স্টোর সাজানো প্রিমিয়াম প্ল্যানের অংশ।",
    },
    href: "/settings?tab=customization",
  },
];
