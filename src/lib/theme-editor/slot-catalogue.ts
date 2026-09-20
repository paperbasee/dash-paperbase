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
export type SlotPageKey = "home" | "product" | "checkout" | "header" | "footer";

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
};

export type Slot = {
  key: string;
  /** `themeEditor.slots.*` key for the tab that names this place. */
  label: string;
  /**
   * Drawn on every page and edited once, so this page shows it but does not
   * offer it. The tab says which, and clicking it goes there.
   */
  inherited?: boolean;
  /**
   * Where an inherited slot's value actually lives: which entry in the page
   * picker owns it, and under which key.
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
  /**
   * Places that sit BESIDE each other in the real page share a row name.
   *
   * Every other page in this editor is a stack of full-width bands, and drawing
   * it that way is honest. The checkout is not a stack: the order sits on the
   * left and the form on the right, and a merchant who is shown two bands will
   * not recognise their own checkout when they meet it. So consecutive slots
   * with the same `row` are drawn side by side, each still its own place with
   * its own tab and its own choices, and they stack on a phone exactly as the
   * shop's own page does.
   */
  row?: string;
  /**
   * Places that share one side of a row, one above the other.
   *
   * A column of a real page is not one thing: the checkout's right-hand side is
   * the form, and then a message, and then the button. Slots in the same `row`
   * that name the same `stack` are that column, in the order written.
   */
  stack?: string;
  /** Its share of that row, as a grid fraction. Taken from the first slot of a stack. */
  span?: number;
  /** `themeEditor.slots.*` key: something true about the place, said before the choices. */
  hint?: string;
  /** What a merchant may put here. Empty when locked or inherited. */
  options?: SlotOption[];
  /** The value that is in the slot to begin with. */
  initial?: string;
  /** Values that mean "nothing here": the slot draws its empty state instead. */
  emptyValues?: string[];
  /** `themeEditor.slots.*` key for what the empty state says. */
  emptyLabel?: string;
};

export const SLOT_PAGES: readonly SlotPageKey[] = ["home", "product", "checkout"] as const;
export const SLOT_GROUPS: readonly SlotPageKey[] = ["header", "footer"] as const;

export const SLOTS: Record<SlotPageKey, Slot[]> = {
  home: [
    { key: "notice", label: "notice", inherited: true, inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inherited: true, inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "hero",
      label: "hero",
      initial: "slider",
      options: [
        { value: "slider", label: "heroSlider", note: "heroSliderNote", shape: "block" },
        { value: "still", label: "heroStill", note: "heroStillNote", shape: "block" },
        { value: "video", label: "heroVideo", note: "heroVideoNote", shape: "block", premium: true },
      ],
    },
    {
      key: "categories",
      label: "categories",
      initial: "tiles",
      emptyValues: ["off"],
      emptyLabel: "categoriesEmpty",
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
      emptyValues: ["off"],
      emptyLabel: "trustRowEmpty",
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
      emptyValues: ["off"],
      emptyLabel: "featuredEmpty",
      options: [
        { value: "row", label: "featuredRow", note: "featuredRowNote", shape: "row" },
        { value: "grid", label: "featuredGrid", note: "featuredGridNote", shape: "block" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    { key: "bands", label: "bands", locked: true, lockedBecause: "bandsWhy" },
    {
      key: "promo",
      label: "promo",
      initial: "none",
      emptyValues: ["none"],
      emptyLabel: "promoEmpty",
      options: [
        { value: "none", label: "nothing", shape: "blank" },
        { value: "text", label: "promoText", shape: "line" },
        { value: "countdown", label: "promoCountdown", note: "promoCountdownNote", shape: "line", premium: true },
        { value: "card", label: "promoCard", note: "promoCardNote", shape: "block", premium: true },
      ],
    },
    {
      key: "bestsellers",
      label: "bestsellers",
      initial: "row",
      emptyValues: ["off"],
      emptyLabel: "bestsellersEmpty",
      options: [
        { value: "row", label: "bestsellersRow", note: "bestsellersRowNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "arrivals",
      label: "arrivals",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "arrivalsEmpty",
      options: [
        { value: "row", label: "arrivalsRow", note: "arrivalsRowNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "brands",
      label: "brands",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "brandsEmpty",
      options: [
        { value: "row", label: "brandsRow", note: "brandsRowNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "reviews",
      label: "reviews",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "reviewsEmpty",
      options: [
        { value: "cards", label: "reviewsCards", note: "reviewsCardsNote", shape: "row", premium: true },
        { value: "quote", label: "reviewsQuote", note: "reviewsQuoteNote", shape: "line", premium: true },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "video",
      label: "video",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "videoEmpty",
      options: [
        { value: "on", label: "videoOn", note: "videoOnNote", shape: "block", premium: true },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "story",
      label: "story",
      initial: "none",
      emptyValues: ["none"],
      emptyLabel: "storyEmpty",
      options: [
        { value: "none", label: "nothing", shape: "blank" },
        { value: "text", label: "storyText", note: "storyTextNote", shape: "line" },
        { value: "both", label: "storyBoth", note: "storyBothNote", shape: "row" },
      ],
    },
    {
      key: "posts",
      label: "posts",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "postsEmpty",
      options: [
        { value: "three", label: "postsThree", note: "postsThreeNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "signup",
      label: "signup",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "signupEmpty",
      options: [
        { value: "whatsapp", label: "signupWhatsapp", note: "signupWhatsappNote", shape: "line" },
        { value: "email", label: "signupEmail", note: "signupEmailNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "faq",
      label: "faq",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "faqEmpty",
      options: [
        { value: "on", label: "faqOn", note: "faqOnNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    { key: "footer", label: "footer", inherited: true, inheritedFrom: { page: "footer", key: "layout" } },
  ],

  product: [
    { key: "notice", label: "notice", inherited: true, inheritedFrom: { page: "header", key: "notice" } },
    { key: "header", label: "header", inherited: true, inheritedFrom: { page: "header", key: "layout" } },
    {
      key: "breadcrumb",
      label: "breadcrumb",
      initial: "on",
      emptyValues: ["off"],
      emptyLabel: "breadcrumbEmpty",
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
    {
      key: "trust",
      label: "trust",
      initial: "on",
      emptyValues: ["off"],
      emptyLabel: "trustEmpty",
      options: [
        { value: "on", label: "on", note: "trustNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "description",
      label: "description",
      initial: "box",
      options: [
        { value: "box", label: "descriptionBox", note: "descriptionBoxNote", shape: "block" },
        { value: "plain", label: "descriptionPlain", note: "descriptionPlainNote", shape: "line" },
      ],
    },
    {
      key: "specs",
      label: "specs",
      initial: "grid",
      options: [
        { value: "grid", label: "specsGrid", note: "specsGridNote", shape: "row" },
        { value: "folded", label: "specsFolded", note: "specsFoldedNote", shape: "line" },
      ],
    },
    {
      key: "shipping",
      label: "shipping",
      initial: "folded",
      emptyValues: ["off"],
      emptyLabel: "shippingEmpty",
      options: [
        { value: "folded", label: "shippingFolded", note: "shippingFoldedNote", shape: "line" },
        { value: "plain", label: "shippingPlain", note: "shippingPlainNote", shape: "block" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "reviews",
      label: "productReviews",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "productReviewsEmpty",
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
      emptyValues: ["off"],
      emptyLabel: "productFaqEmpty",
      options: [
        { value: "on", label: "productFaqOn", note: "productFaqOnNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "related",
      label: "related",
      initial: "on",
      emptyValues: ["off"],
      emptyLabel: "relatedEmpty",
      options: [
        { value: "on", label: "on", note: "relatedNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "recent",
      label: "recent",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "recentEmpty",
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
    { key: "footer", label: "footer", inherited: true, inheritedFrom: { page: "footer", key: "layout" } },
  ],

  checkout: [
    { key: "notice", label: "notice", inherited: true, inheritedFrom: { page: "header", key: "notice" } },
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
      emptyValues: ["off"],
      emptyLabel: "trustEmpty",
      options: [
        { value: "on", label: "on", note: "trustLineNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "steps",
      label: "checkoutSteps",
      initial: "none",
      emptyValues: ["none"],
      emptyLabel: "checkoutStepsEmpty",
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
      row: "body",
      stack: "left",
      span: 1,
      hint: "checkoutOrderHint",
      initial: "quantity",
      options: [
        { value: "quantity", label: "orderQuantity", note: "orderQuantityNote", shape: "row" },
        { value: "fixed", label: "orderFixed", note: "orderFixedNote", shape: "line" },
      ],
    },
    /**
     * A coupon box -- and the one place in this editor with NO feature behind it.
     *
     * Paperbase has no coupons: no code, no limit, no expiry, nowhere to make
     * one. `discount_total` on an order is the sum of per-line product
     * discounts, which is a sale price and not a code a shopper types. So this
     * is off to begin with, and the chooser says why rather than letting a
     * merchant switch on a box that cannot take anything.
     *
     * Whoever wires this: the design is the small half of the job.
     */
    {
      key: "coupon",
      label: "checkoutCoupon",
      row: "body",
      stack: "left",
      hint: "checkoutCouponHint",
      initial: "off",
      emptyValues: ["off"],
      emptyLabel: "couponEmpty",
      options: [
        { value: "off", label: "off", note: "couponOffNote", shape: "blank" },
        { value: "link", label: "couponLink", note: "couponLinkNote", shape: "line" },
        { value: "open", label: "couponOpen", note: "couponOpenNote", shape: "row" },
      ],
    },
    {
      key: "form",
      label: "checkoutForm",
      row: "body",
      stack: "right",
      span: 1.15,
      /* The same value as Settings > Checkout. Said here, because two screens
         editing one setting is a thing a merchant should be told, not find. */
      hint: "checkoutFormHint",
      initial: "extended",
      options: [
        { value: "extended", label: "formExtended", note: "formExtendedNote", shape: "block" },
        { value: "minimal", label: "formMinimal", note: "formMinimalNote", shape: "line" },
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
      row: "body",
      stack: "right",
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
      emptyValues: ["off"],
      emptyLabel: "checkoutPaymentsEmpty",
      options: [
        { value: "on", label: "paymentsOn", note: "checkoutPaymentsNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "after",
      label: "after",
      initial: "line",
      emptyValues: ["none"],
      emptyLabel: "afterEmpty",
      options: [
        { value: "line", label: "afterLine", note: "afterLineNote", shape: "line" },
        { value: "none", label: "nothing", shape: "blank" },
      ],
    },
    {
      key: "footerStyle",
      label: "checkoutFooter",
      initial: "policies",
      emptyValues: ["none"],
      emptyLabel: "checkoutFooterEmpty",
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
      emptyValues: ["off"],
      emptyLabel: "noticeEmpty",
      options: [
        { value: "message", label: "noticeMessage", note: "noticeMessageNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "layout",
      label: "headerLayout",
      initial: "bar",
      options: [
        { value: "bar", label: "headerBar", note: "headerBarNote", shape: "line" },
        { value: "inline", label: "headerInline", note: "headerInlineNote", shape: "line" },
        { value: "masthead", label: "headerMasthead", note: "headerMastheadNote", shape: "block" },
        { value: "split", label: "headerSplit", note: "headerSplitNote", shape: "row" },
        { value: "drawer", label: "headerDrawer", note: "headerDrawerNote", shape: "blank" },
      ],
    },
    {
      key: "search",
      label: "headerSearch",
      initial: "box",
      options: [
        { value: "box", label: "searchBox", note: "searchBoxNote", shape: "line" },
        { value: "icon", label: "searchIcon", note: "searchIconNote", shape: "blank" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "sticky",
      label: "sticky",
      initial: "on",
      options: [
        { value: "on", label: "on", note: "stickyNote", shape: "line" },
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
    {
      key: "contact",
      label: "footerContact",
      initial: "full",
      emptyValues: ["off"],
      emptyLabel: "footerContactEmpty",
      options: [
        { value: "full", label: "contactFull", note: "contactFullNote", shape: "line" },
        { value: "email", label: "contactEmail", note: "contactEmailNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "social",
      label: "footerSocial",
      initial: "marks",
      emptyValues: ["off"],
      emptyLabel: "footerSocialEmpty",
      options: [
        { value: "marks", label: "socialMarks", note: "socialMarksNote", shape: "row" },
        { value: "names", label: "socialNames", note: "socialNamesNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      key: "payments",
      label: "footerPayments",
      initial: "on",
      emptyValues: ["off"],
      emptyLabel: "footerPaymentsEmpty",
      options: [
        { value: "on", label: "paymentsOn", note: "paymentsOnNote", shape: "row" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
    {
      // On by default, and the home page's own sign-up is off: the footer is
      // where a shopper expects this, so a shop gets one out of the box and a
      // merchant adds the second deliberately rather than discovering two.
      key: "newsletter",
      label: "footerNewsletter",
      initial: "email",
      emptyValues: ["off"],
      emptyLabel: "footerNewsletterEmpty",
      options: [
        { value: "email", label: "signupEmail", note: "footerNewsletterEmailNote", shape: "line" },
        { value: "whatsapp", label: "signupWhatsapp", note: "footerNewsletterWhatsappNote", shape: "line" },
        { value: "off", label: "off", shape: "blank" },
      ],
    },
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

/** Is this slot showing nothing at all right now? */
export function isEmpty(slot: Slot, value: string | undefined): boolean {
  return Boolean(slot.emptyValues?.includes(value ?? ""));
}
