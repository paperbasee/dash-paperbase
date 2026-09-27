import type { SignupPlatform } from "@/lib/storeSocialLinks";

/**
 * The slots each page offers, and what may go in each one.
 *
 * **This is design data, not the API's.** The owner decided on 2026-09-20 that a
 * merchant arranges nothing: every page has the same places in the same order,
 * and the only choice is what fills each place. This file is the shape of that
 * idea, written down so the screen can be built and looked at before any of it
 * is wired to a theme document.
 *
 * When it IS wired, every field below comes from the theme manifest the API
 * already serves (`sections`, `settings`, `option_labels`) and this file goes
 * away. Nothing here should grow logic: it is a list to render, and the moment
 * it needs a rule it belongs in `document-ops` with the rest.
 *
 * Copy lives in `messages/{en,bn}.json` under `themeEditor.slots`, like the rest
 * of the editor -- a key missing in either language renders as the raw key, and
 * most merchants read the Bangla one.
 */

/** Which page a merchant is looking at. Matches the editor's existing page keys. */
export type SlotPageKey =
  | "home"
  | "category"
  | "product"
  | "reviews"
  | "search"
  | "blog"
  | "article"
  | "wishlist"
  | "account"
  | "cart"
  | "checkout"
  | "header"
  | "footer";

/** The wireframe drawn on an option's tile, so a merchant sees the shape before choosing. */
export type OptionShape = "blank" | "line" | "block" | "row";

export type SlotOption = {
  /** Stored value. Matches the section setting this will become. */
  value: string;
  /** `themeEditor.slots.*` key for the name. */
  label: string;
  /** Optional `themeEditor.slots.*` key for the line under the name. */
  note?: string;
  shape: OptionShape;
  /** Shown with its badge before a merchant pays for it. */
  premium?: boolean;
  /** A platform's own logo on the tile, in place of the shape: the Sign-up band's choices. */
  platform?: SignupPlatform;
};

export type Slot = {
  key: string;
  /** `themeEditor.slots.*` key for the name of this place. */
  label: string;
  /**
   * A place drawn on this page and owned by another -- the header, the footer,
   * the product page's promises (the home page's): which entry owns it, and
   * under which key. The preview's marks and the list both use the owner.
   *
   * It has to be said rather than guessed. A page drew its header from a
   * setting called `header`, but the Header entry stores its arrangement under
   * `layout` -- so the lookup missed every time and the masthead never changed
   * anywhere but on the Header entry itself. Worse, `header` and `footer` BOTH
   * call their arrangement `layout`, so merging the two into one object let the
   * footer's value answer for the header's.
   */
  inheritedFrom?: { page: SlotPageKey; key: string };
  /**
   * Its shape is the platform's, not a merchant's: the buying column and the
   * checkout form are where people pay. Clicking still answers -- with the
   * reason, rather than doing nothing.
   */
  locked?: boolean;
  /** `themeEditor.slots.*` key for that reason. */
  lockedBecause?: string;
  /** `themeEditor.slots.*` key: something true about the place, said before the choices. */
  hint?: string;
  /** What a merchant may put here. Empty when locked or inherited. */
  options?: SlotOption[];
  /** The value that is in the slot to begin with. */
  initial?: string;
};

/** In the order a shopper meets them. */
export const SLOT_PAGES: readonly SlotPageKey[] = [
  "home",
  "category",
  "product",
  "reviews",
  "search",
  "blog",
  "article",
  "wishlist",
  "account",
  "cart",
  "checkout",
] as const;

/**
 * Pages whose FEATURE does not exist yet, and the line that says so.
 *
 * Designing a page ahead of building it is reasonable; letting a merchant
 * believe they are arranging a page their shoppers can reach is not. So a page
 * in here says which it is, in the same place the design-only line is said.
 *
 * **Empty since 2026-09-24, and that is the point.** It held `account` and
 * `wishlist`, saying a shopper "cannot sign in at all" and that there is "no
 * wishlist in Paperbase yet". Both were built on 2026-09-21 and both lines
 * stayed up for three days, on the screen a merchant designs those pages from.
 * The owner found the account one.
 *
 * *A note about what does not exist yet has to be deleted by whoever makes it
 * exist.* Nothing else will: it reads as deliberate, it is in a file nobody
 * opens to ship a feature, and the merchant it misleads is the one person who
 * cannot check.
 */
export const PAGE_NOTES: Partial<Record<SlotPageKey, string>> = {};

export const SLOTS: Record<SlotPageKey, Slot[]> = {
  home: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "hero",
      label: "hero",
      initial: "slider",
      /*
        Two, not three. "A still picture" was a third option until 2026-09-22,
        and it was the same section as the slider: a hero with one picture IS a
        still. A choice that decides nothing is exactly what this editor was
        rebuilt to stop offering.
      */
      options: [
        { value: "slider", label: "heroSlider", note: "heroSliderNote", shape: "block" },
        { value: "video", label: "heroVideo", note: "heroVideoNote", shape: "block", premium: true },
      ],
    },
    {
      key: "categories",
      label: "categories",
      initial: "tiles",
      options: [
        { value: "tiles", label: "categoriesTiles", note: "categoriesTilesNote", shape: "row" },
        { value: "strip", label: "categoriesStrip", note: "categoriesStripNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "trust",
      label: "trustRow",
      initial: "icons",
      options: [
        { value: "icons", label: "trustIcons", note: "trustIconsNote", shape: "row" },
        { value: "line", label: "trustLinePlain", note: "trustLinePlainNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "featured",
      label: "featured",
      initial: "row",
      /*
        One shape. "A grid of eight" was a second option until 2026-09-23: the
        band is one row that scrolls, with arrows and a link to the page that
        holds every pick, so the grid is that page rather than a choice here.
      */
      options: [
        { value: "row", label: "featuredRow", note: "featuredRowNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    /*
      Best sellers straight under the picked band (owner, 2026-09-26, after the
      research): the products that already sell come early, not after three
      long department rows. The API's seed order and its migration 0042 say the
      same, and a test holds the two lists together.
    */
    {
      key: "bestsellers",
      label: "bestsellers",
      initial: "row",
      options: [
        { value: "row", label: "bestsellersRow", note: "bestsellersRowNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    /*
      Three departments, picked here since 2026-09-23. It was LOCKED before --
      "which categories, and their order, you choose in Products" -- because the
      page drew one band per department, all of them, and a real shop came out
      nineteen rows deep.

      No options: there is one thing this place can be, and a chooser with a
      single tile is a choice that decides nothing. What a merchant edits here
      is which three.
    */
    { key: "bands", label: "bands", hint: "bandsHint", initial: "on" },
    /*
      The promotion, wired 2026-09-23. Three shapes of one section -- words on a
      band, a picture beside them, a picture behind them -- where the drawing
      offered four choices, one of which ("a card with a picture") nothing had
      built, and badged only two of them paid.

      **Every shape is paid**, because the SECTION is: the theme marks it
      premium and `without_premium_sections` strips it at serve time, so a shop
      on Essential never had the free-looking one either.

      The countdown is not a shape. It is a tick-box on any of them, and the
      merchant needs an end time for it to count to -- which is why it lives in
      the pop-up with the dates rather than out here.
    */
    {
      key: "promo",
      label: "promo",
      initial: "none",
      options: [
        { value: "none", label: "nothing", shape: "blank" },
        { value: "strip", label: "promoStrip", note: "promoStripNote", shape: "line", premium: true },
        { value: "beside", label: "promoBeside", note: "promoBesideNote", shape: "block", premium: true },
        { value: "behind", label: "promoBehind", note: "promoBehindNote", shape: "block", premium: true },
      ],
    },
    {
      key: "arrivals",
      label: "arrivals",
      initial: "off",
      options: [
        { value: "row", label: "arrivalsRow", note: "arrivalsRowNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    /*
      The rest of the page, wired 2026-09-24. A "Video" place sat between the
      reviews and the posts until then, and it was the same `video` section the
      hero's Video choice already owns -- two places cannot both own one
      section, and the hero offers a video. Taken back.

      Brands, reviews and posts are READ from the shop, so what a merchant
      decides is whether they are on (and, for reviews, their shape); the
      sign-up is WhatsApp or nothing, the email newsletter having been dropped.
    */
    {
      key: "brands",
      label: "brands",
      initial: "off",
      options: [
        { value: "row", label: "brandsRow", note: "brandsRowNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "reviews",
      label: "reviews",
      initial: "off",
      options: [
        { value: "cards", label: "reviewsCards", note: "reviewsCardsNote", shape: "row", premium: true },
        { value: "quote", label: "reviewsQuote", note: "reviewsQuoteNote", shape: "line", premium: true },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "posts",
      label: "posts",
      initial: "off",
      options: [
        { value: "three", label: "postsThree", note: "postsThreeNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      /*
        Where the band's button goes (owner, 2026-09-26: "instead of WhatsApp, we can make it
        universal"). WhatsApp first: a band saved before the choice existed carries no platform,
        and reads as the first answer that fits -- the WhatsApp it always was.
      */
      key: "signup",
      label: "signup",
      initial: "off",
      options: [
        { value: "whatsapp", label: "signupWhatsapp", note: "signupWhatsappNote", shape: "line", platform: "whatsapp" },
        { value: "messenger", label: "signupMessenger", note: "signupMessengerNote", shape: "line", platform: "messenger" },
        { value: "facebook", label: "signupFacebook", note: "signupFacebookNote", shape: "line", platform: "facebook" },
        { value: "instagram", label: "signupInstagram", note: "signupInstagramNote", shape: "line", platform: "instagram" },
        { value: "tiktok", label: "signupTiktok", note: "signupTiktokNote", shape: "line", platform: "tiktok" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "faq",
      label: "faq",
      initial: "off",
      options: [
        { value: "on", label: "faqOn", note: "faqOnNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  product: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "breadcrumb",
      label: "breadcrumb",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "breadcrumbNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      /**
       * One slot, because the pictures and the buying column share a row: drawn
       * as two they would say the page stacks them, which it does not. The
       * pictures are a merchant's choice; the column is not, and the chooser
       * says so rather than a lock on a slot that is half editable.
       */
      key: "buy",
      label: "buy",
      initial: "frame",
      options: [
        { value: "frame", label: "galleryFrame", note: "galleryFrameNote", shape: "row" },
        { value: "column", label: "galleryColumn", note: "galleryColumnNote", shape: "block" },
        { value: "single", label: "gallerySingle", note: "gallerySingleNote", shape: "block" },
      ],
    },
    /*
      The same four promises the home page shows, so a shopper is told the same
      thing wherever they are standing. Picked once, on the Home page -- two
      lists would be two answers to one question.
    */
    { key: "trust", label: "trust", inheritedFrom: { page: "home", key: "trust" } },
    /*
      The fold-out rows that end the buying column (2026-09-25). No options: a
      place with one answer draws no chooser -- what a merchant edits here is
      the words and the rows, in the dialog.
    */
    { key: "details", label: "detailRows", hint: "detailRowsHint" },
    {
      key: "reviews",
      label: "productReviews",
      initial: "off",
      options: [
        { value: "cards", label: "productReviewsCards", note: "productReviewsCardsNote", shape: "row", premium: true },
        { value: "summary", label: "productReviewsSummary", note: "productReviewsSummaryNote", shape: "line", premium: true },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "faq",
      label: "productFaq",
      initial: "off",
      options: [
        { value: "on", label: "productFaqOn", note: "productFaqOnNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "related",
      label: "related",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "relatedNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "recent",
      label: "recent",
      // On, because that is what every shop has been drawing since the page
      // was built -- the switch simply had nothing to write to until
      // 2026-09-23, when the strip became a section of its own.
      initial: "on",
      options: [
        { value: "on", label: "recentOn", note: "recentOnNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "stickybuy",
      label: "stickyBuy",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "stickyBuyNote", shape: "line" },
        { value: "off", label: "off", note: "stickyBuyOffNote", shape: "blank" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  /**
   * A category: the page a shopper browses rather than reads.
   *
   * It is the shop's widest page -- most people arrive on a category from a
   * search engine or the menu rather than on the home page -- and today it is
   * a heading and a grid with nothing between them.
   *
   * **Sorting and filtering are real and already built.** The API takes
   * `ordering` (newest, price_asc, price_desc, popularity), `price_min`,
   * `price_max`, `brand` and `attributes`, honours every one of them in
   * `build_product_list_queryset`, and serves the values to populate the
   * controls from `CatalogFiltersView` -- whose own docstring says it is "for
   * product list UI". The storefront has never asked for any of it. So these
   * are not wishes: they are a UI for a thing that already works, which is why
   * they are offered here rather than left out the way the coupon nearly was.
   */
  category: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "breadcrumb",
      label: "breadcrumb",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "catBreadcrumbNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "heading",
      label: "catHeading",
      initial: "plain",
      options: [
        { value: "plain", label: "catHeadingPlain", note: "catHeadingPlainNote", shape: "line" },
        { value: "eyebrow", label: "catHeadingEyebrow", note: "catHeadingEyebrowNote", shape: "line" },
        { value: "banner", label: "catHeadingBanner", note: "catHeadingBannerNote", shape: "block" },
      ],
    },
    {
      key: "count",
      label: "catCount",
      initial: "off",
      options: [
        { value: "on", label: "on", note: "catCountNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    /*
      Sorting, real since 2026-09-23. The API has taken `ordering` -- newest,
      price up, price down, most popular -- since long before the editor, and
      honoured it; nothing on the storefront had ever asked for it, so no
      shopper could. This is the control, not the feature.

      The shop offers FIVE, not the four drawn here: the fifth is the merchant's
      own shelf order, which is what the page is in until somebody sorts it. A
      control offering only four would show "Newest" filled over a page that was
      in no such order.
    */
    {
      key: "sort",
      label: "catSort",
      hint: "catSortHint",
      initial: "off",
      options: [
        { value: "off", label: "off", note: "catSortOffNote", shape: "blank" },
        { value: "menu", label: "catSortMenu", note: "catSortMenuNote", shape: "line" },
        { value: "tabs", label: "catSortTabs", note: "catSortTabsNote", shape: "row" },
      ],
    },
    {
      key: "filters",
      label: "catFilters",
      hint: "catFiltersHint",
      initial: "off",
      options: [
        { value: "off", label: "off", shape: "blank" },
        { value: "chips", label: "catFiltersChips", note: "catFiltersChipsNote", shape: "line" },
        { value: "rail", label: "catFiltersRail", note: "catFiltersRailNote", shape: "row" },
      ],
    },
    {
      key: "grid",
      label: "catGrid",
      hint: "catGridHint",
      initial: "four",
      options: [
        { value: "four", label: "catGridFour", note: "catGridFourNote", shape: "row" },
        { value: "three", label: "catGridThree", note: "catGridThreeNote", shape: "row" },
        { value: "two", label: "catGridTwo", note: "catGridTwoNote", shape: "block" },
      ],
    },
    /*
      Getting to the rest. Numbered pages are the theme's default: a page of a
      shop is a cached document with an address, so `?page=2` is bookmarkable,
      indexable and cacheable, and it works with no JavaScript -- the rule the
      rest of the storefront follows.

      **The button is that same link**, upgraded by a script into fetch and
      append. It was a tile here from the day this page was drawn and was taken
      out on 2026-09-23 because the shop could not draw one; it came back the
      same day with the script. A tile that changes nothing is the broken
      promise this whole stretch of work exists to end.
    */
    {
      key: "more",
      label: "catMore",
      hint: "catMoreHint",
      initial: "pages",
      options: [
        { value: "pages", label: "catMorePages", note: "catMorePagesNote", shape: "line" },
        { value: "button", label: "catMoreButton", note: "catMoreButtonNote", shape: "line" },
        { value: "none", label: "catMoreNone", note: "catMoreNoneNote", shape: "blank" },
      ],
    },
    {
      key: "text",
      label: "catText",
      initial: "off",
      options: [
        { value: "off", label: "off", shape: "blank" },
        { value: "block", label: "catTextBlock", note: "catTextBlockNote", shape: "block" },
      ],
    },
    {
      key: "empty",
      label: "catEmptyLabel",
      hint: "catEmptyHint",
      initial: "text",
      options: [
        { value: "text", label: "catEmptyText", note: "catEmptyTextNote", shape: "line" },
        { value: "invite", label: "catEmptyInvite", note: "catEmptyInviteNote", shape: "block" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  /**
   * Search: the page for a shopper who already knows what they want.
   *
   * The most intent anyone shows in a shop. Wired 2026-09-24, and the notes
   * that were here described the RETIRED storefront: ten results at most and a
   * prev/next that could never appear. The shop on Django shows 48 at a time
   * and reaches the rest the way a category does.
   *
   * **The categories come ABOVE the products** (owner, 2026-09-24). Someone who
   * types a department's name usually wants the whole department, and the shop
   * has always drawn them first; the canvas had them under the grid.
   *
   * **"Other things to try" is gone** (owner, 2026-09-24). It promised
   * near-miss names, "so a bad spelling is not a dead end" -- and nothing in
   * Paperbase finds a near miss. The only suggestions the API has are the
   * names of products that ALREADY matched: a repeat of the grid, and empty
   * exactly when the spelling is wrong. It can come back when search itself
   * learns to forgive a spelling.
   *
   * "Before they have typed" is what the whole-screen search shows the moment
   * it opens, and until two letters are in the box -- the one place a shopper
   * types a search since 2026-09-24, when the page lost its own field (owner:
   * "why are there two input boxes?"). The page shows the same choice to
   * anyone who reaches it with nothing searched.
   */
  search: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "heading",
      label: "searchHeading",
      initial: "withCount",
      options: [
        { value: "withCount", label: "searchHeadingCount", note: "searchHeadingCountNote", shape: "line" },
        { value: "plain", label: "searchHeadingPlain", note: "searchHeadingPlainNote", shape: "line" },
      ],
    },
    {
      key: "categories",
      label: "searchCategories",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "searchCategoriesNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "grid",
      label: "catGrid",
      hint: "catGridHint",
      initial: "four",
      options: [
        { value: "four", label: "catGridFour", note: "catGridFourNote", shape: "row" },
        { value: "three", label: "catGridThree", note: "catGridThreeNote", shape: "row" },
        { value: "two", label: "catGridTwo", note: "catGridTwoNote", shape: "block" },
      ],
    },
    {
      key: "more",
      label: "catMore",
      hint: "searchMoreHint",
      initial: "none",
      options: [
        { value: "none", label: "catMoreNone", note: "searchMoreNoneNote", shape: "blank" },
        { value: "button", label: "catMoreButton", note: "catMoreButtonNote", shape: "line" },
        { value: "pages", label: "catMorePages", note: "catMorePagesNote", shape: "line" },
      ],
    },
    {
      key: "empty",
      label: "searchEmpty",
      hint: "searchEmptyHint",
      initial: "text",
      options: [
        { value: "text", label: "cartEmptyText", note: "searchEmptyTextNote", shape: "line" },
        { value: "invite", label: "cartEmptyInvite", note: "searchEmptyInviteNote", shape: "block" },
      ],
    },
    {
      key: "prompt",
      label: "searchPrompt",
      hint: "searchPromptHint",
      initial: "hint",
      options: [
        { value: "hint", label: "searchPromptHintOption", note: "searchPromptHintNote", shape: "line" },
        { value: "trending", label: "searchPromptTrending", note: "searchPromptTrendingNote", shape: "row" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  /**
   * The blog, and a post: two templates the API already separates
   * (`blog` and `blog_article`), so two entries rather than one.
   *
   * A shop's blog is not a magazine. It is there so a search engine has
   * something to send people to and so a shopper who wants convincing can be
   * convinced, which is why what a post carries -- who wrote it, when, how many
   * have read it, what to read next -- matters more here than how the shelf is
   * arranged.
   *
   * Everything offered is already in the payload: `tags` filter through
   * `?tag=<slug>` on the public list, `views` ships on every card, and
   * `author_name` is on the DETAIL serializer only. That last one is why a
   * byline is a choice on a post and not on a card: the list does not know it.
   *
   * **Wired 2026-09-24.** Three things were not as drawn: the shop showed ONE
   * featured post large, not "four across" (so one large is the default and
   * says so); the read count was counted only when a ten-minute cache ran out
   * (the API counts every read now); and the search box had a button that did
   * nothing, since it narrows the posts as a reader types.
   *
   * **The post, wired the same day.** The shop drew a third of it: no way
   * back, no date, no posts either side, a More posts shelf that never
   * appeared, and words with no styling at all -- printed as their own tags.
   * The name under the title is the account's first and last name and NEVER
   * its email, which both serializers had fallen back to.
   */
  blog: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "heading",
      label: "blogHeading",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "blogHeadingNote", shape: "line" },
        { value: "off", label: "off", note: "blogHeadingOffNote", shape: "blank" },
      ],
    },
    {
      key: "search",
      label: "blogSearch",
      initial: "off",
      options: [
        { value: "off", label: "off", shape: "blank" },
        { value: "on", label: "on", note: "blogSearchNote", shape: "line" },
      ],
    },
    {
      key: "tags",
      label: "blogTags",
      hint: "blogTagsHint",
      initial: "off",
      options: [
        { value: "off", label: "off", shape: "blank" },
        { value: "row", label: "blogTagsRow", note: "blogTagsRowNote", shape: "line" },
      ],
    },
    {
      key: "featured",
      label: "blogFeatured",
      hint: "blogFeaturedHint",
      initial: "hero",
      options: [
        { value: "hero", label: "blogFeaturedHero", note: "blogFeaturedHeroNote", shape: "block" },
        { value: "shelf", label: "blogFeaturedShelf", note: "blogFeaturedShelfNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "latest",
      label: "blogLatest",
      initial: "grid",
      options: [
        { value: "grid", label: "blogLatestGrid", note: "blogLatestGridNote", shape: "row" },
        { value: "rows", label: "blogLatestRows", note: "blogLatestRowsNote", shape: "line" },
      ],
    },
    {
      key: "cards",
      label: "blogCards",
      initial: "full",
      options: [
        { value: "full", label: "blogCardsFull", note: "blogCardsFullNote", shape: "block" },
        { value: "picture", label: "blogCardsPicture", note: "blogCardsPictureNote", shape: "block" },
        { value: "words", label: "blogCardsWords", note: "blogCardsWordsNote", shape: "line" },
      ],
    },
    {
      key: "meta",
      label: "blogMeta",
      hint: "blogMetaHint",
      initial: "date",
      options: [
        { value: "date", label: "blogMetaDate", note: "blogMetaDateNote", shape: "line" },
        { value: "reads", label: "blogMetaReads", note: "blogMetaReadsNote", shape: "line" },
        { value: "none", label: "nothing", shape: "blank" },
      ],
    },
    {
      key: "text",
      label: "catText",
      initial: "off",
      options: [
        { value: "off", label: "off", shape: "blank" },
        { value: "block", label: "catTextBlock", note: "blogTextBlockNote", shape: "block" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  article: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "back",
      label: "articleBack",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "articleBackNote", shape: "line" },
        { value: "off", label: "off", note: "articleBackOffNote", shape: "blank" },
      ],
    },
    /*
      The picture. "Title only" used to be the first tile and said it was what
      the shop did today -- and the shop drew the post's picture under its
      title. That is the default now, named for what it is, and title-only is
      the third choice rather than the claim.
    */
    {
      key: "head",
      label: "articleHead",
      initial: "under",
      options: [
        { value: "under", label: "articleHeadUnder", note: "articleHeadUnderNote", shape: "block" },
        { value: "top", label: "articleHeadTop", note: "articleHeadTopNote", shape: "block" },
        { value: "off", label: "articleHeadOff", note: "articleHeadOffNote", shape: "line" },
      ],
    },
    {
      key: "byline",
      label: "articleByline",
      hint: "articleBylineHint",
      initial: "date",
      options: [
        { value: "date", label: "articleBylineDate", note: "articleBylineDateNote", shape: "line" },
        { value: "author", label: "articleBylineAuthor", note: "articleBylineAuthorNote", shape: "line" },
        { value: "none", label: "nothing", shape: "blank" },
      ],
    },
    {
      key: "body",
      label: "articleBody",
      hint: "articleBodyHint",
      initial: "narrow",
      options: [
        { value: "narrow", label: "articleBodyNarrow", note: "articleBodyNarrowNote", shape: "block" },
        { value: "wide", label: "articleBodyWide", note: "articleBodyWideNote", shape: "block" },
      ],
    },
    {
      key: "tags",
      label: "blogTags",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "articleTagsNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "prevNext",
      label: "articlePrevNext",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "articlePrevNextNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "related",
      label: "articleRelated",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "articleRelatedNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  /**
   * Every review in the shop, on a page of its own (owner, 2026-09-25), wired
   * from the start (see `WIRED_SLOTS.reviews`). Shoppers narrow it by stars,
   * category and product -- always there, so not a choice -- and a merchant
   * decides the two things that are: the score above the reviews, and whether
   * the reviews are a list or cards. Sold with the reviews: the shop opens it
   * only where a (premium) reviews section is shown.
   */
  reviews: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "summary",
      label: "reviewsPageSummary",
      initial: "bars",
      options: [
        { value: "bars", label: "reviewsPageBars", note: "reviewsPageBarsNote", shape: "block", premium: true },
        { value: "none", label: "reviewsPageNothing", note: "reviewsPageNothingNote", shape: "blank", premium: true },
      ],
    },
    {
      key: "layout",
      label: "reviewsPageLayout",
      hint: "reviewsPageLayoutHint",
      initial: "rows",
      options: [
        { value: "rows", label: "wishItemsRows", note: "reviewsPageRowsNote", shape: "line", premium: true },
        { value: "cards", label: "reviewsPageCards", note: "reviewsPageCardsNote", shape: "row", premium: true },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  /**
   * The wishlist, wired 2026-09-24 (see `WIRED_SLOTS.wishlist`).
   *
   * This note used to say there was no wishlist in Paperbase -- true when the
   * slot design was drawn, false since 2026-09-21, and still here three days
   * later. A note about what does not exist yet has to be deleted by whoever
   * makes it exist.
   */
  wishlist: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "heading",
      label: "wishHeading",
      initial: "withCount",
      options: [
        { value: "withCount", label: "wishHeadingCount", note: "wishHeadingCountNote", shape: "line" },
        { value: "plain", label: "searchHeadingPlain", note: "wishHeadingPlainNote", shape: "line" },
      ],
    },
    {
      key: "items",
      label: "wishItems",
      initial: "grid",
      options: [
        { value: "grid", label: "wishItemsGrid", note: "wishItemsGridNote", shape: "row" },
        { value: "rows", label: "wishItemsRows", note: "wishItemsRowsNote", shape: "line" },
      ],
    },
    {
      key: "action",
      label: "wishAction",
      hint: "wishActionHint",
      initial: "cart",
      options: [
        { value: "cart", label: "wishActionCart", note: "wishActionCartNote", shape: "line" },
        { value: "look", label: "wishActionLook", note: "wishActionLookNote", shape: "blank" },
      ],
    },
    {
      key: "empty",
      label: "wishEmpty",
      hint: "wishEmptyHint",
      initial: "invite",
      options: [
        { value: "text", label: "cartEmptyText", note: "wishEmptyTextNote", shape: "line" },
        { value: "invite", label: "cartEmptyInvite", note: "wishEmptyInviteNote", shape: "block" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  /**
   * The account: designed, not built, and the bigger of the two gaps.
   *
   * A shopper cannot sign in to a Paperbase shop. There is no session, no
   * password, no code sent to a phone. `Customer` is the merchant's own record
   * of somebody who ordered -- name, phone, total spent -- built from orders
   * and never signed into.
   *
   * Which is why the first place here is the interesting one. "Look up an
   * order" needs no accounts at all: a phone number and an order number are
   * things a customer already has, and it answers the question almost everyone
   * opens this page to ask. Signing in answers more, and costs an entire
   * feature. Both are offered rather than the second being assumed.
   */
  /**
   * The account: the page a shopper reaches once the shop knows who they are.
   *
   * **Three of the five places here were promises the shop could not keep**,
   * and they were rewritten on 2026-09-24 when the page was wired:
   *
   * - "Before they are known" offered order-tracking OR signing in. Both are
   *   on: accounts belong to every shop (owner, 2026-09-22) and the tracker is
   *   a module switch in Settings. Neither is the theme's to decide, so the
   *   place is gone.
   * - "What the page holds" offered editable details and an address book. The
   *   shop has neither -- and the one thing this page DOES hold that no other
   *   page does, the shopper's own reviews, was not mentioned at all. So that
   *   place is gone too, and `reviews` stands in its place.
   * - Its notes said signing in "needs sign-in built first -- there is none
   *   today". It was built on 2026-09-21.
   */
  account: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    /**
     * The welcome card (owner, 2026-09-25): their face, how the shop reaches
     * them, how long they have been a member, what they have here and their
     * newest order. The choice is how it greets them; "nothing" leaves the
     * whole card out, and sign-out stays at the foot of the page either way.
     */
    {
      key: "greeting",
      label: "accountGreeting",
      hint: "accountGreetingHint",
      initial: "name",
      options: [
        { value: "name", label: "accountGreetingName", note: "accountGreetingNameNote", shape: "line" },
        { value: "plain", label: "accountGreetingPlain", note: "accountGreetingPlainNote", shape: "line" },
        { value: "none", label: "nothing", shape: "blank" },
      ],
    },
    {
      key: "orders",
      label: "accountOrders",
      initial: "rows",
      options: [
        { value: "rows", label: "accountOrdersRows", note: "accountOrdersRowsNote", shape: "line" },
        { value: "cards", label: "accountOrdersCards", note: "accountOrdersCardsNote", shape: "block" },
      ],
    },
    /**
     * What they have written, in every state -- including the ones only they
     * and the shop can see.
     *
     * **On, and a merchant switching it off is choosing something with a
     * cost**: a review waiting for approval that its own author cannot find
     * reads as lost, and the natural response to that is to write it again.
     */
    {
      key: "reviews",
      label: "accountReviews",
      hint: "accountReviewsHint",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "accountReviewsOnNote", shape: "block" },
        { value: "off", label: "off", note: "accountReviewsOffNote", shape: "blank" },
      ],
    },
    {
      key: "empty",
      label: "accountEmpty",
      initial: "text",
      options: [
        { value: "text", label: "cartEmptyText", note: "accountEmptyTextNote", shape: "line" },
        { value: "invite", label: "cartEmptyInvite", note: "accountEmptyInviteNote", shape: "block" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  /**
   * The cart: the page between wanting something and paying for it.
   *
   * It is the page a shop leaves alone and should not. Everything a shopper
   * does here is a decision to carry on or to stop, so the places worth owning
   * are the ones that answer a reason to stop -- what delivery costs, what else
   * they nearly bought, and what an empty cart says instead of nothing.
   */
  cart: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "heading",
      label: "cartHeading",
      initial: "withLink",
      options: [
        { value: "withLink", label: "cartHeadingWithLink", note: "cartHeadingWithLinkNote", shape: "line" },
        { value: "plain", label: "cartHeadingPlain", note: "cartHeadingPlainNote", shape: "line" },
      ],
    },
    {
      key: "steps",
      label: "checkoutSteps",
      initial: "none",
      options: [
        { value: "none", label: "nothing", note: "checkoutStepsNoneNote", shape: "blank" },
        { value: "bar", label: "checkoutStepsBar", note: "cartStepsBarNote", shape: "line" },
      ],
    },
    /**
     * The two columns of the cart, the same shape the checkout has: what they
     * are buying on the left, what it comes to on the right.
     *
     * The old cart was a stack -- items, then a total tucked under them -- and
     * the total is the one thing a shopper opens this page to see. Beside the
     * items it is on screen from the moment the page loads, at any length of
     * cart. Below them it is wherever the scrollbar happens to leave it.
     */
    {
      key: "lines",
      label: "cartLines",
      hint: "cartLinesHint",
      initial: "cards",
      options: [
        { value: "cards", label: "cartLinesCards", note: "cartLinesCardsNote", shape: "block" },
        { value: "table", label: "cartTable", note: "cartTableNote", shape: "row" },
      ],
    },
    {
      key: "total",
      label: "cartTotal",
      hint: "cartTotalHint",
      initial: "full",
      options: [
        { value: "full", label: "cartTotalFull", note: "cartTotalFullNote", shape: "block" },
        { value: "simple", label: "cartTotalSimple", note: "cartTotalSimpleNote", shape: "line" },
      ],
    },
    /**
     * The promo field, INSIDE the summary it would come off -- a box floating
     * under the panel is not where anybody looks for a discount. Off to begin
     * with: most shops run no campaign, and a box with nothing behind it sends
     * a shopper off to hunt for a code that does not exist.
     *
     * The summary above reads this: a discount line has no business in the
     * totals of a shop that is not offering one, so it appears only when the
     * field a shopper would type into does. (Paperbase has run discount codes
     * since 2026-09-22; the note here said it did not until 2026-09-24.)
     */
    {
      key: "coupon",
      label: "checkoutCoupon",
      hint: "checkoutCouponHint",
      initial: "off",
      /* No empty state: the summary above is where this actually appears, so
         this band is the control for it and has to stay visible to be clicked
         -- hatching it over would hide the only way to switch it on. */
      options: [
        { value: "off", label: "off", note: "couponOffNote", shape: "blank" },
        { value: "link", label: "couponLink", note: "couponLinkNote", shape: "line" },
        { value: "open", label: "couponOpen", note: "couponOpenNote", shape: "row" },
      ],
    },
    /**
     * What this cart can be paid with, under the summary rather than down the
     * page: it is read on the way to the button, or it is not read at all.
     *
     * A band is one column here, so it has to sit beside the ones it shares
     * that column with -- `bandsOf` groups CONSECUTIVE slots of the same row.
     */
    {
      key: "payments",
      label: "checkoutPayments",
      initial: "off",
      options: [
        { value: "on", label: "paymentsOn", note: "cartPaymentsNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "trust",
      label: "trustLine",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "cartTrustNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "sticky",
      label: "cartSticky",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "cartStickyNote", shape: "line" },
        { value: "off", label: "off", note: "cartStickyOffNote", shape: "blank" },
      ],
    },
    {
      key: "upsell",
      label: "cartUpsell",
      hint: "cartUpsellHint",
      initial: "row",
      options: [
        { value: "off", label: "off", shape: "blank" },
        { value: "row", label: "cartUpsellRow", note: "cartUpsellRowNote", shape: "row" },
        { value: "picks", label: "cartUpsellPicks", note: "cartUpsellPicksNote", shape: "row", premium: true },
      ],
    },
    {
      key: "recent",
      label: "recent",
      initial: "off",
      options: [
        { value: "on", label: "on", note: "cartRecentNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "empty",
      label: "cartEmpty",
      hint: "cartEmptyHint",
      initial: "text",
      options: [
        { value: "text", label: "cartEmptyText", note: "cartEmptyTextNote", shape: "line" },
        { value: "invite", label: "cartEmptyInvite", note: "cartEmptyInviteNote", shape: "block" },
      ],
    },
    { key: "footer", label: "footer", inheritedFrom: { page: "footer", key: "layout" } },
  ],

  checkout: [
    { key: "notice", label: "notice", inheritedFrom: { page: "header", key: "notice" } },
    {
      /**
       * Checkout gets its OWN header and footer rather than inheriting them.
       *
       * Every shop that sells seriously strips this page: a nav, a search box
       * and a category row are all ways out of a page a shopper is halfway
       * through paying on. Offering that is not a look, it is the difference
       * between a checkout and a page that happens to have a form on it.
       */
      key: "chrome",
      label: "checkoutChrome",
      initial: "reduced",
      options: [
        { value: "reduced", label: "chromeReduced", note: "chromeReducedNote", shape: "line" },
        { value: "full", label: "chromeFull", note: "chromeFullNote", shape: "block" },
      ],
    },
    {
      key: "trust",
      label: "trustLine",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "trustLineNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "steps",
      label: "checkoutSteps",
      initial: "none",
      options: [
        { value: "none", label: "nothing", note: "checkoutStepsNoneNote", shape: "blank" },
        { value: "bar", label: "checkoutStepsBar", note: "checkoutStepsBarNote", shape: "line" },
      ],
    },
    /**
     * The two columns of the page people actually pay on.
     *
     * The order is on the left and the form is on the right, which is the
     * shop's own arrangement and not a choice -- so it is not offered as one.
     * What IS a choice is what each column does, and those are the two
     * highest-stakes settings in the editor: whether a shopper may still change
     * the order here, and how much they are asked for before they can buy.
     */
    {
      key: "summary",
      label: "checkoutOrder",
      hint: "checkoutOrderHint",
      initial: "quantity",
      options: [
        { value: "quantity", label: "orderQuantity", note: "orderQuantityNote", shape: "row" },
        { value: "fixed", label: "orderFixed", note: "orderFixedNote", shape: "line" },
      ],
    },
    /**
     * The promo field, INSIDE the summary beside it -- the cart's rule, for the
     * same reason: a box floating under the panel is not where anybody looks
     * for a discount, and a shopper who typed a code one page ago looks for it
     * in the same place here.
     *
     * Off to begin with. Most shops run no campaign, and a box with nothing
     * behind it sends a shopper off to hunt for a code that does not exist.
     * (Paperbase has run discount codes since 2026-09-22; this note said it had
     * none until 2026-09-24.)
     */
    {
      key: "coupon",
      label: "checkoutCoupon",
      hint: "checkoutCouponHint",
      initial: "off",
      /* No empty state, for the reason the cart's has none: the promo row is
         drawn INSIDE the summary above, so this band is the control for it and
         has to stay visible to be clicked. Hatching it over hid the only way to
         switch it on. */
      options: [
        { value: "off", label: "off", note: "couponOffNote", shape: "blank" },
        { value: "link", label: "couponLink", note: "couponLinkNote", shape: "line" },
        { value: "open", label: "couponOpen", note: "couponOpenNote", shape: "row" },
      ],
    },
    {
      key: "form",
      label: "checkoutForm",
      /* The same value as Settings > Checkout. Said here, because two screens
         editing one setting is a thing a merchant should be told, not find. */
      hint: "checkoutFormHint",
      initial: "extended",
      options: [
        { value: "extended", label: "formExtended", note: "formExtendedNote", shape: "block" },
        { value: "minimal", label: "formMinimal", note: "formMinimalNote", shape: "line" },
      ],
    },
    {
      /* How shoppers give their district (owner, 2026-09-27): typed, as every
         shop has, or picked from Bangladesh's 64 with a search box. A shop
         setting like the form above, and the order is held to it. */
      key: "district",
      label: "checkoutDistrict",
      hint: "checkoutDistrictHint",
      initial: "text",
      options: [
        { value: "text", label: "districtText", note: "districtTextNote", shape: "line" },
        { value: "list", label: "districtList", note: "districtListNote", shape: "block" },
      ],
    },
    /**
     * The last thing a shopper reads before they pay.
     *
     * It draws the button with it, because the place is defined by where it
     * sits and a banner floating on its own is not recognisable. That also
     * means it has no empty state: switched off, this slot is still the button,
     * so there is nothing to hatch over and nothing a merchant can lose.
     */
    {
      key: "beforePay",
      label: "checkoutBeforePay",
      hint: "checkoutBeforePayHint",
      initial: "off",
      options: [
        { value: "off", label: "off", note: "beforePayOffNote", shape: "blank" },
        { value: "note", label: "beforePayNote", note: "beforePayNoteNote", shape: "line" },
        { value: "warning", label: "beforePayWarning", note: "beforePayWarningNote", shape: "line" },
      ],
    },
    {
      key: "payments",
      label: "checkoutPayments",
      initial: "on",
      options: [
        { value: "on", label: "paymentsOn", note: "checkoutPaymentsNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "after",
      label: "after",
      initial: "line",
      options: [
        { value: "line", label: "afterLine", note: "afterLineNote", shape: "line" },
        { value: "none", label: "nothing", shape: "blank" },
      ],
    },
    {
      key: "footerStyle",
      label: "checkoutFooter",
      initial: "policies",
      options: [
        { value: "policies", label: "checkoutFooterPolicies", note: "checkoutFooterPoliciesNote", shape: "line" },
        { value: "same", label: "checkoutFooterSame", note: "checkoutFooterSameNote", shape: "row" },
        { value: "none", label: "nothing", shape: "blank" },
      ],
    },
  ],

  header: [
    {
      key: "notice",
      label: "notice",
      initial: "message",
      options: [
        { value: "message", label: "noticeMessage", note: "noticeMessageNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    /*
      Wired 2026-09-24, the last places on the editor; five designs since
      2026-09-25 (owner: "every image I give you will be one design") -- four
      from the shops the owner pointed at, and the menu button kept from
      before. Search lost its box: every design searches from an icon, as every
      one of those shops does, and there is still no "off".
    */
    {
      key: "layout",
      label: "headerLayout",
      initial: "classic",
      options: [
        { value: "classic", label: "headerClassic", note: "headerClassicNote", shape: "line" },
        { value: "centred", label: "headerCentred", note: "headerCentredNote", shape: "block" },
        { value: "split", label: "headerSplit", note: "headerSplitNote", shape: "line" },
        { value: "minimal", label: "headerMinimal", note: "headerMinimalNote", shape: "line" },
        { value: "compact", label: "headerCompact", note: "headerCompactNote", shape: "blank" },
      ],
    },
    /*
      The shop's own logo (2026-09-26): the picture in the dialog -- SVG, PNG,
      WebP or JPEG, uploaded through the API so an SVG is cleaned -- and how tall
      it stands, as tiles. With no picture the header shows the shop's name, as
      it always has.
    */
    {
      key: "logo",
      label: "logoPlace",
      hint: "logoPlaceHint",
      initial: "medium",
      options: [
        { value: "small", label: "logoSmall", note: "logoSmallNote", shape: "line" },
        { value: "medium", label: "logoMedium", note: "logoMediumNote", shape: "line" },
        { value: "large", label: "logoLarge", note: "logoLargeNote", shape: "line" },
      ],
    },
    /*
      The menu (step 3, 2026-09-25): the merchant's own links -- a page, a
      category or a web address each, with optional words and a highlight --
      and whether a category opens its subcategories. No tiles: a list is
      built, not chosen. Empty, the shop draws its categories as before.
    */
    { key: "menu", label: "headerMenu", hint: "headerMenuHint" },
    /*
      Step 4 (owner, 2026-09-26): a button of the merchant's own -- words and a
      link, no tiles. ("Over the picture" came and went the same day.)
    */
    { key: "button", label: "headerButton", hint: "headerButtonHint" },
    {
      key: "sticky",
      label: "sticky",
      initial: "scroll_up",
      options: [
        { value: "scroll_up", label: "stickyScrollUp", note: "stickyScrollUpNote", shape: "line" },
        { value: "always", label: "stickyAlways", note: "stickyAlwaysNote", shape: "line" },
        { value: "off", label: "off", note: "stickyOffNote", shape: "blank" },
      ],
    },
    {
      key: "marks",
      label: "marks",
      initial: "off",
      options: [
        { value: "off", label: "marksCartOnly", shape: "line" },
        { value: "on", label: "marksBoth", note: "marksBothNote", shape: "row" },
      ],
    },
    /*
      The icons, 2026-09-25: how heavy they are drawn (Phosphor's weights,
      regular the owner's pick of 2026-09-19), whether their words sit beside
      them on a computer, and which shape the cart is.
    */
    {
      key: "icons",
      label: "headerIcons",
      initial: "regular",
      options: [
        { value: "light", label: "iconsLight", note: "iconsLightNote", shape: "line" },
        { value: "regular", label: "iconsRegular", note: "iconsRegularNote", shape: "line" },
        { value: "bold", label: "iconsBold", note: "iconsBoldNote", shape: "line" },
      ],
    },
    {
      key: "words",
      label: "headerWords",
      initial: "off",
      options: [
        { value: "off", label: "headerWordsOff", shape: "line" },
        { value: "on", label: "headerWordsOn", note: "headerWordsOnNote", shape: "row" },
      ],
    },
    {
      key: "cart",
      label: "headerCart",
      initial: "bag",
      options: [
        { value: "bag", label: "cartBag", shape: "line" },
        { value: "basket", label: "cartBasket", shape: "line" },
        { value: "cart", label: "cartCart", shape: "line" },
      ],
    },
  ],

  footer: [
    {
      key: "layout",
      label: "footerLayout",
      initial: "columns",
      options: [
        { value: "columns", label: "footerColumns", note: "footerColumnsNote", shape: "row" },
        { value: "split", label: "footerSplit", note: "footerSplitNote", shape: "block" },
        { value: "centred", label: "footerCentred", note: "footerCentredNote", shape: "line" },
        { value: "minimal", label: "footerMinimal", note: "footerMinimalNote", shape: "blank" },
      ],
    },
    /*
      The merchant's own columns (2026-09-25): a title and up to six links each --
      pages, categories, their policies, web addresses -- up to four columns. No
      tiles: a list is built, not chosen, as the header's menu is.
    */
    { key: "columns", label: "footerColumnsPlace", hint: "footerColumnsHint" },
    {
      key: "contact",
      label: "footerContact",
      initial: "full",
      options: [
        { value: "full", label: "contactFull", note: "contactFullNote", shape: "line" },
        { value: "email", label: "contactEmail", note: "contactEmailNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      // Names first: the shop wrote them out, and a merchant's footer does not
      // change under them until they choose the marks.
      key: "social",
      label: "footerSocial",
      initial: "names",
      options: [
        { value: "names", label: "socialNames", note: "socialNamesNote", shape: "line" },
        { value: "marks", label: "socialMarks", note: "socialMarksNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      // Off first, as the shop drew it. What it names is what the shop takes:
      // cash on delivery always, bKash and Nagad only where a product is paid
      // for up front -- there is no card gateway, so no card is named.
      key: "payments",
      label: "footerPayments",
      initial: "off",
      options: [
        { value: "off", label: "off", shape: "blank" },
        { value: "on", label: "paymentsOn", note: "paymentsOnNote", shape: "row" },
      ],
    },
    /*
      A sign-up place sat here until 2026-09-24 -- email, then WhatsApp or
      nothing -- and the home page's WhatsApp band put the same invitation on a
      page twice. The owner kept the band: "remove one WhatsApp, from the
      footer". `theming/0032` took the setting out of every document.
    */
    {
      key: "bottom",
      label: "footerBottom",
      initial: "copyright",
      options: [
        { value: "copyright", label: "bottomCopyright", note: "bottomCopyrightNote", shape: "line" },
        { value: "policies", label: "bottomPolicies", note: "bottomPoliciesNote", shape: "line" },
      ],
    },
  ],
};

/** What every slot on a page starts as, so the screen opens in a real state. */
export function initialChoices(page: SlotPageKey): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slot of SLOTS[page]) {
    if (slot.initial) out[slot.key] = slot.initial;
  }
  return out;
}

