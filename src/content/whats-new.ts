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
    id: "2026-09-18-card-style-on-every-theme",
    date: "2026-09-18",
    version: "4.12.3",
    tag: "fixed",
    title: {
      en: "Card style works on every theme",
      bn: "কার্ড স্টাইল এখন সব থিমেই কাজ করে",
    },
    body: {
      en: "The product card style setting only appeared while your store was on Basic. It now appears on any theme that uses it, so you can switch between the quiet card and the price-first card on Heritage too.",
      bn: "পণ্যের কার্ড স্টাইল আগে শুধু বেসিক থিমে দেখা যেত। এখন যেসব থিম এটি ব্যবহার করে সব জায়গাতেই দেখা যাবে, তাই হেরিটেজেও শান্ত কার্ড আর দাম-আগে কার্ডের মধ্যে বদল করতে পারবেন।",
    },
    href: "/settings?tab=customization",
  },
  {
    id: "2026-09-18-heritage-theme",
    date: "2026-09-18",
    version: "4.12.2",
    tag: "new",
    title: {
      en: "Heritage: a new look for fashion stores",
      bn: "হেরিটেজ: ফ্যাশন স্টোরের নতুন চেহারা",
    },
    body: {
      en: "Heritage is the first of our designed themes, made for clothing: your shop name centred at the top, a warm sand and terracotta palette, and large serif type in both Bangla and English. It comes with its own colours and lettering, so choosing it changes the whole store, not just the layout. Product names are never cut short, whichever language you sell in, and your Basic design stays exactly where you left it.",
      bn: "হেরিটেজ আমাদের প্রথম ডিজাইন করা থিম, তৈরি হয়েছে পোশাকের দোকানের জন্য: উপরে মাঝখানে দোকানের নাম, উষ্ণ বালু আর টেরাকোটা রঙ, আর বাংলা-ইংরেজি দুটোতেই বড় সেরিফ অক্ষর। এর নিজস্ব রং আর অক্ষর আছে, তাই এটি বেছে নিলে পুরো দোকানের চেহারাই বদলায় — শুধু সাজানো নয়। যে ভাষাতেই বিক্রি করুন, পণ্যের নাম কেটে ছোট করা হয় না, আর আপনার বেসিক ডিজাইন যেমন ছিল তেমনই থাকবে।",
    },
    href: "/settings?tab=customization",
  },
  {
    id: "2026-09-18-banners-move-into-the-editor",
    date: "2026-09-18",
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
    id: "2026-09-18-every-plan-can-customize",
    date: "2026-09-18",
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
    id: "2026-09-18-team-screen-in-bangla",
    date: "2026-09-18",
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
    id: "2026-09-18-theme-editor-and-live-preview",
    date: "2026-09-18",
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
    id: "2026-09-17-managers-can-edit-storefront-look",
    date: "2026-09-17",
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
    id: "2026-09-17-purchases-count-at-order-time",
    date: "2026-09-17",
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
    id: "2026-09-16-brief-glitch-no-longer-hides-a-product",
    date: "2026-09-16",
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
    id: "2026-09-16-blog-posts-open-again",
    date: "2026-09-16",
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
    id: "2026-09-16-faster-storefront",
    date: "2026-09-16",
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
    id: "2026-09-16-ivory-colours-and-language-in-store-info",
    date: "2026-09-16",
    version: "4.8.0",
    tag: "improved",
    title: {
      en: "Colour choices removed, language moved to Store Info",
      bn: "রঙ বাছাইয়ের অপশন সরানো হলো, ভাষা এখন স্টোর তথ্যে",
    },
    body: {
      en: "Every store now uses the Ivory colours, so the colour choice is gone from Settings → Customization. Store language moved to Settings → Store Info and is saved with the Save button there. Your storefront pages also load a little lighter.",
      bn: "সব স্টোর এখন Ivory রঙ ব্যবহার করে, তাই সেটিংস → কাস্টমাইজেশন থেকে রঙ বাছাইয়ের অপশন সরানো হয়েছে। স্টোরের ভাষা এখন সেটিংস → স্টোর তথ্য-এ, আর সেখানে সংরক্ষণ বাটনে চাপলে সেভ হয়। আপনার স্টোরফ্রন্টের পেজগুলোও এখন একটু হালকাভাবে লোড হয়।",
    },
    href: "/settings?tab=store",
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
];
