import type { ThemeDocument, ThemeSection } from "@/lib/theme-editor/api";
import { pageSections, type PageKey } from "@/lib/theme-editor/document-ops";
import type { EditorAction } from "@/lib/theme-editor/editor-reducer";
import { SLOTS, type Slot, type SlotPageKey } from "@/lib/theme-editor/slot-catalogue";

/**
 * Which place on the canvas is which section of the shop's document.
 *
 * The slot catalogue describes the editor a merchant sees; the theme manifest
 * describes what the storefront can draw. This is the one file that says they
 * are the same thing, place by place. A slot that is in here is **wired**: its
 * choice is read from the shop's own document and every edit is written back to
 * it. A slot that is not is still the drawing it has always been.
 *
 * One entry at a time, deliberately. A place goes in here when its section can
 * do everything the place promises -- so a merchant never meets a choice that
 * changes nothing, which is the whole complaint that started this work.
 */
export type WiredSlot = {
  /** The list in the document that holds it: a group, or `templates.<name>`. */
  page: PageKey;
  /**
   * What each of this place's values IS: a section type, and the settings that
   * make the section into THAT value.
   *
   * Three shapes, in the order they turned up:
   *
   *   one section        the notice strip is an announcement bar or nothing
   *   two sections       the hero is pictures or a video -- different sections,
   *                      so choosing one hides the other rather than removing
   *                      it, and a merchant who tries the video still has the
   *                      pictures they chose
   *   one section, two   the category band is tiles or a row of names: the same
   *   shapes             section with `layout` set differently, because the
   *                      merchant is choosing how it LOOKS. Two sections would
   *                      let them put both on the page.
   */
  sections: Record<string, string | { type: string; settings: Record<string, unknown> }>;
  /**
   * The value that means nothing is here, when the place offers one. A place
   * whose every choice is a section (the hero) has none.
   */
  off?: string;
  /**
   * The section's words this place OWNS, drawn as fields in its dialog and in
   * no other.
   *
   * Several places share one section on the cart, the checkout and the blog,
   * and a setting no tile decides used to be drawn as a field in EVERY one of
   * them -- the words said before paying turned up under the discount code,
   * and the blog's name would have turned up under its tags. A place that
   * claims its words keeps them; a setting nobody claims is still drawn
   * wherever the section is, as before.
   */
  fields?: string[];
  /**
   * The kind of part this place's dialog adds, removes and orders, when its
   * section holds more than one kind.
   *
   * Every section with parts had ONE kind -- a picture, a question -- and the
   * dialog took the first it found. The buying column holds its name, price,
   * picker and buttons as parts too, and a merchant's own fold-out rows beside
   * them (2026-09-25); taking the first there offered to add a second product
   * name. A section with one kind still needs nothing said.
   */
  blocks?: string;
};

/** Wired places, by the page picker entry that edits them. */
export const WIRED_SLOTS: Partial<Record<SlotPageKey, Record<string, WiredSlot>>> = {
  header: {
    notice: { page: "header", sections: { message: "announcement_bar" }, off: "off" },
    /*
      The rest of the header: settings of the one `header` section, the
      theme's default FIRST in each map -- a document that has never chosen
      reads as the first value whose settings it does not contradict.
    */
    layout: {
      page: "header",
      sections: {
        classic: { type: "header", settings: { header_layout: "classic" } },
        centred: { type: "header", settings: { header_layout: "centred" } },
        split: { type: "header", settings: { header_layout: "split" } },
        minimal: { type: "header", settings: { header_layout: "minimal" } },
        compact: { type: "header", settings: { header_layout: "compact" } },
      },
    },
    /*
      The menu's dialog: the header section's `item` parts, and the one switch
      no tile decides -- whether a category opens its subcategories.
    */
    menu: {
      page: "header",
      sections: { links: "header" },
      fields: ["dropdowns"],
      blocks: "item",
    },
    sticky: {
      page: "header",
      sections: {
        scroll_up: { type: "header", settings: { sticky: "scroll_up" } },
        always: { type: "header", settings: { sticky: "always" } },
        off: { type: "header", settings: { sticky: "off" } },
      },
    },
    marks: {
      page: "header",
      sections: {
        off: { type: "header", settings: { show_account_links: false } },
        on: { type: "header", settings: { show_account_links: true } },
      },
    },
    icons: {
      page: "header",
      sections: {
        regular: { type: "header", settings: { icon_weight: "regular" } },
        light: { type: "header", settings: { icon_weight: "light" } },
        bold: { type: "header", settings: { icon_weight: "bold" } },
      },
    },
    words: {
      page: "header",
      sections: {
        off: { type: "header", settings: { icon_labels: false } },
        on: { type: "header", settings: { icon_labels: true } },
      },
    },
    cart: {
      page: "header",
      sections: {
        bag: { type: "header", settings: { cart_icon: "bag" } },
        basket: { type: "header", settings: { cart_icon: "basket" } },
        cart: { type: "header", settings: { cart_icon: "cart" } },
      },
    },
  },
  home: {
    hero: {
      page: "templates.home",
      sections: { slider: "banner_slider", video: "video" },
    },
    categories: {
      page: "templates.home",
      sections: {
        tiles: { type: "category_tiles", settings: { layout: "tiles" } },
        strip: { type: "category_tiles", settings: { layout: "strip" } },
      },
      off: "off",
    },
    /*
      The shop's promises -- cash on delivery, easy returns -- ticked four at a
      time out of sixteen. Two shapes of ONE section, like the category band:
      the merchant is choosing how their promises look, not what they are, and
      two sections would let them put both on the page.

      Picked here and drawn in two places: the product page's Promises is an
      inherited slot pointing back at this one, the way the notice strip is
      owned by the Header entry and drawn everywhere.
    */
    trust: {
      page: "templates.home",
      sections: {
        icons: { type: "promises", settings: { layout: "marks" } },
        line: { type: "promises", settings: { layout: "line" } },
      },
      off: "off",
    },
    featured: { page: "templates.home", sections: { row: "featured_products" }, off: "off" },
    /*
      The three departments. One value and no `off`: the theme marks this
      section required, so it cannot be hidden or removed -- what a merchant
      decides is which three, not whether.
    */
    bands: { page: "templates.home", sections: { on: "category_products" } },
    /*
      The promotion: one section, three layouts, exactly like the category
      band's two shapes. `none` hides it rather than removing it -- a merchant
      who takes a sale down for a fortnight keeps the words they wrote.
    */
    promo: {
      page: "templates.home",
      sections: {
        strip: { type: "promo", settings: { layout: "strip" } },
        beside: { type: "promo", settings: { layout: "beside" } },
        behind: { type: "promo", settings: { layout: "behind" } },
      },
      off: "none",
    },
    bestsellers: { page: "templates.home", sections: { row: "best_sellers" }, off: "off" },
    arrivals: { page: "templates.home", sections: { row: "new_arrivals" }, off: "off" },
    /*
      The rest of the page, 2026-09-24. Brands, reviews and posts are read from
      the shop -- a heading is all a merchant writes -- and the reviews are one
      section in two shapes, like the category band. The questions are the
      `faq` section's own blocks, written in the pop-up.
    */
    brands: { page: "templates.home", sections: { row: "brand_row" }, off: "off" },
    reviews: {
      page: "templates.home",
      sections: {
        cards: { type: "review_highlights", settings: { layout: "cards" } },
        quote: { type: "review_highlights", settings: { layout: "quote" } },
      },
      off: "off",
    },
    posts: { page: "templates.home", sections: { three: "latest_posts" }, off: "off" },
    signup: { page: "templates.home", sections: { whatsapp: "whatsapp" }, off: "off" },
    faq: { page: "templates.home", sections: { on: "faq" }, off: "off" },
  },
  /*
    The product page, 2026-09-23. Stage 1 of the same four-stage shape the
    category page took: the places whose sections already exist.

    Two of them write settings the shop has honoured all along and no place
    wrote -- the description's box and the specifications' two columns -- which
    is the exact complaint that started this work: a choice a merchant could
    see and could not make.

    **The tile values and the stored values differ here**, and that is fine: a
    tile is what a merchant reads, a setting is what the theme understands. The
    theme's own DEFAULT still has to come first in each map, or a document that
    has never heard of the setting reads as the wrong tile.

    Reviews, recently viewed, the phone buy bar and delivery-and-returns are
    stages 2 to 4 and stay drawings until their sections can do what the place
    promises.
  */
  product: {
    breadcrumb: { page: "templates.product", sections: { on: "breadcrumb" }, off: "off" },
    /*
      The pictures. Three shapes of one section, like the category heading --
      the merchant is choosing how their pictures are SHOWN, and two sections
      would let them put both on the page.
    */
    buy: {
      page: "templates.product",
      sections: {
        frame: { type: "product_gallery", settings: { gallery_style: "frame" } },
        column: { type: "product_gallery", settings: { gallery_style: "column" } },
        single: { type: "product_gallery", settings: { gallery_style: "single" } },
      },
    },
    /*
      The column's fold-out rows (owner, 2026-09-25: "like this, with icons"):
      Product details -- the description, with the specifications inside it --
      then Shipping details and Exchange policy, the shop's words for every
      product, then rows the merchant adds (a heading, an icon, some text).

      One place, and no tiles: there is nothing to choose between, only words
      to write and rows to add. It replaces three -- the description's box or
      heading, the specifications' grid or fold, and the "Delivery and returns"
      strip below the product -- which `theming/0034` folded into the column:
      the strip's words are the Shipping details now.

      `product_details` is also the buying column, so there is no `off`: the
      rows with nothing written are simply not drawn.
    */
    details: {
      page: "templates.product",
      sections: { rows: "product_details" },
      fields: ["shipping_text", "exchange_text"],
      blocks: "row",
    },
    /*
      Reviews, 2026-09-23 (stage 2). Two shapes of one section: the band as it
      has always been, or the score and the count alone. `off` REMOVES nothing
      -- it hides the section, so a shop that takes the band down for a month
      keeps every review it has and the heading it wrote.

      `cards` first: it is the theme's default and what every shop that has the
      band is already drawing.

      Both shapes are paid, and the gate is the theme's `premium` flag on the
      section -- not anything here. A lapsed shop stops being SERVED the band
      and is never refused at save, or a downgraded shop could not save its
      theme at all.
    */
    reviews: {
      page: "templates.product",
      sections: {
        cards: { type: "product_reviews", settings: { layout: "cards" } },
        summary: { type: "product_reviews", settings: { layout: "summary" } },
      },
      off: "off",
    },
    related: { page: "templates.product", sections: { on: "related_products" }, off: "off" },
    faq: { page: "templates.product", sections: { on: "product_questions" }, off: "off" },
    /*
      The shopper's own trail, 2026-09-23 (stage 3). It was rendered by the
      template, last on the page, so the switch here had nothing to write to.
      A section of its own now -- `theming/0026` puts one in every document, or
      every shop would have lost the strip the day the template stopped drawing
      it.
    */
    recent: { page: "templates.product", sections: { on: "recently_viewed" }, off: "off" },
    /*
      The phone buy bar. A SETTING of the buying column, not a section: it is
      part of buying, it lives inside `[data-buy-scope]` so the cart and the
      variant picker drive it with no code of its own, and a merchant does not
      arrange it anywhere.

      `true` first, because the theme's default is on -- which is what the
      editor has drawn since the slot design, so what a merchant reads is what
      they get.
    */
    stickybuy: {
      page: "templates.product",
      sections: {
        on: { type: "product_details", settings: { sticky_buy: true } },
        off: { type: "product_details", settings: { sticky_buy: false } },
      },
    },
  },
  /*
    The cart, 2026-09-23 (round 1 of four). The page was not part of the theme
    at all -- no template, no section -- so all eleven of its places were
    drawings with nowhere to write. `theming/0027` gives every document the
    page; these four are the first with something behind them.

    Everything writes ONE section, because the cart page is one thing: a
    heading, the lines, the numbers and the way on. The coupon, the sticky bar,
    the upsell and the rest join it in later rounds.
  */
  cart: {
    heading: {
      page: "templates.cart",
      sections: {
        withLink: { type: "cart", settings: { heading_link: true } },
        plain: { type: "cart", settings: { heading_link: false } },
      },
    },
    lines: {
      page: "templates.cart",
      sections: {
        cards: { type: "cart", settings: { lines: "cards" } },
        table: { type: "cart", settings: { lines: "table" } },
      },
    },
    total: {
      page: "templates.cart",
      sections: {
        full: { type: "cart", settings: { total: "full" } },
        simple: { type: "cart", settings: { total: "simple" } },
      },
    },
    /*
      The discount code box, 2026-09-23 (round 2). The FEATURE shipped on
      2026-09-22; this is only its shape. `open` first, because it is what every
      shop drew before there was a choice -- and the shop still draws nothing at
      all where a merchant runs no codes, whichever shape is picked.
    */
    coupon: {
      page: "templates.cart",
      sections: {
        open: { type: "cart", settings: { coupon: "open" } },
        link: { type: "cart", settings: { coupon: "link" } },
        off: { type: "cart", settings: { coupon: "off" } },
      },
    },
    payments: {
      page: "templates.cart",
      sections: {
        off: { type: "cart", settings: { payments: false } },
        on: { type: "cart", settings: { payments: true } },
      },
    },
    /*
      The total and Check out, kept on a phone screen while a long cart is
      scrolled. On, because that is what the editor has drawn since the slot
      design -- the same call the product page's buy bar made.
    */
    sticky: {
      page: "templates.cart",
      sections: {
        on: { type: "cart", settings: { sticky: true } },
        off: { type: "cart", settings: { sticky: false } },
      },
    },
    /*
      What the shop promises, said before a shopper leaves the page -- round 4,
      the last two places on this canvas.

      **The words are not chosen here.** A merchant picks their promises once,
      on the home page, and this only says whether the cart repeats them. The
      product page does the same. A second list would be a second thing to keep
      in step, and the first shop to edit one and not the other would find out.
    */
    trust: {
      page: "templates.cart",
      sections: {
        on: { type: "cart", settings: { trust: true } },
        off: { type: "cart", settings: { trust: false } },
      },
      fields: ["trust_text"],
    },
    /*
      Cart, checkout, done. `none` first: it is the theme's default, and a bar
      is a claim about how long this takes -- not something to start making on
      a merchant's behalf.
    */
    steps: {
      page: "templates.cart",
      sections: {
        none: { type: "cart", settings: { steps: false } },
        bar: { type: "cart", settings: { steps: true } },
      },
    },
    /*
      The row of things to add, 2026-09-23 (round 3). Two VALUES, two SECTIONS,
      like the hero's pictures and video -- and here that is not a style choice:
      the paid shape has to be its own section, because a premium SECTION is
      what `documents.without_premium_sections` strips at serve time and there
      is no per-option gate. A shop that stops paying loses the clever band
      rather than quietly keeping a paid feature.

      Both draw the same row. They differ in which products the view fetches.
    */
    upsell: {
      page: "templates.cart",
      sections: { row: "cart_upsell", picks: "cart_upsell_picks" },
      off: "off",
    },
    /*
      What they looked at and did not take. The same section the product page
      uses -- a trail is a trail -- and off by default here, which is what the
      editor has always drawn for the cart.
    */
    recent: { page: "templates.cart", sections: { on: "recently_viewed" }, off: "off" },
    /*
      `when_empty`, not the obvious name: `empty` is a reserved word in Liquid
      and the category page's grid met it the hard way. The PLACE is still
      called `empty` -- that is the editor's own name for it and nothing in
      Liquid reads it.
    */
    empty: {
      page: "templates.cart",
      sections: {
        text: { type: "cart", settings: { when_empty: "text" } },
        invite: { type: "cart", settings: { when_empty: "invite" } },
      },
    },
  },
  /*
    Every review in the shop, 2026-09-25: one section, `review_page`, whose two
    settings are these two places. The first key of each is the theme's default
    -- the score above, the reviews as a list.
  */
  reviews: {
    summary: {
      page: "templates.reviews",
      sections: {
        bars: { type: "review_page", settings: { summary: "bars" } },
        none: { type: "review_page", settings: { summary: "none" } },
      },
    },
    layout: {
      page: "templates.reviews",
      sections: {
        rows: { type: "review_page", settings: { layout: "rows" } },
        cards: { type: "review_page", settings: { layout: "cards" } },
      },
    },
  },
  /*
    The wishlist, 2026-09-24. The fifth and last page that was drawn in markup
    no merchant could reach -- and unlike the account's, all four of its places
    were real things the shop could do, two of which it already did.

    `items` decides what the VIEW renders in two places: a shopper who is not
    signed in has a list only their browser knows, so those cards are asked for
    afterwards and drawn on their own. Both go through one snippet, or the two
    halves of one page disagree about their shape.
  */
  wishlist: {
    heading: {
      page: "templates.wishlist",
      sections: {
        withCount: { type: "wishlist", settings: { heading: "count" } },
        plain: { type: "wishlist", settings: { heading: "plain" } },
      },
    },
    items: {
      page: "templates.wishlist",
      sections: {
        grid: { type: "wishlist", settings: { items: "grid" } },
        rows: { type: "wishlist", settings: { items: "rows" } },
      },
    },
    /*
      What a saved item offers. "Add to cart" leaves the card exactly as the
      shop draws it everywhere else -- the owner's call on 2026-09-24 -- so a
      shop whose card style carries Order now shows Order now here. "Just the
      product" takes the shortcut away WITHOUT changing what the card is: it is
      `quiet`, not a third card style, because drawing the shelf card for it
      changed nothing at all on a shop whose cards are already shelf.
    */
    action: {
      page: "templates.wishlist",
      sections: {
        cart: { type: "wishlist", settings: { action: "cart" } },
        look: { type: "wishlist", settings: { action: "look" } },
      },
    },
    /*
      Almost everyone who opens a wishlist for the first time sees this, so it
      is the version of the page most people meet. `invite` first: it is the
      theme's default and what every shop drew before this was a choice.
    */
    empty: {
      page: "templates.wishlist",
      sections: {
        invite: { type: "wishlist", settings: { when_empty: "invite" } },
        text: { type: "wishlist", settings: { when_empty: "text" } },
      },
    },
  },
  /*
    The account, 2026-09-24. The last of the four pages drawn in markup no
    merchant could reach -- and the one whose places were furthest from the
    truth: two of the five offered things the shop has never had, and none of
    them mentioned the reviews it has held since 2026-09-22. See the note on
    `SLOTS.account` for what went and why.

    Two of these decide what the VIEW FETCHES and not only what is drawn -- the
    pictures on an order card, and the reviews themselves -- so the shop reads
    them in `views/account.py` before it queries anything.
  */
  account: {
    greeting: {
      page: "templates.account",
      sections: {
        name: { type: "account", settings: { greeting: "name" } },
        plain: { type: "account", settings: { greeting: "plain" } },
        none: { type: "account", settings: { greeting: "none" } },
      },
    },
    orders: {
      page: "templates.account",
      sections: {
        rows: { type: "account", settings: { orders: "rows" } },
        cards: { type: "account", settings: { orders: "cards" } },
      },
    },
    /*
      ON first, because it is the theme's default and because switching it off
      has a cost a merchant should meet deliberately: a review waiting for
      approval that its own author cannot find reads as lost, and the natural
      response to that is to write it again.
    */
    reviews: {
      page: "templates.account",
      sections: {
        on: { type: "account", settings: { reviews: true } },
        off: { type: "account", settings: { reviews: false } },
      },
    },
    /*
      `when_empty`, not `empty`: a reserved word in Liquid. The PLACE is still
      called `empty` -- that is the editor's own name for it and nothing in
      Liquid reads it.
    */
    empty: {
      page: "templates.account",
      sections: {
        text: { type: "account", settings: { when_empty: "text" } },
        invite: { type: "account", settings: { when_empty: "invite" } },
      },
    },
  },
  /*
    The checkout, 2026-09-24 (round 1). The page the whole shop is for, and the
    last one still drawn in markup no merchant could reach: `theming/0028` gives
    every document the page, exactly as `0027` did for the cart the day before.

    Five places here, and they are the page's SHELL and what stands above the
    form. The header and the footer are the two that make this page different
    from every other one wired so far: they are drawn OUTSIDE the template, in
    the layout, so the shop reads these two answers in `views/checkout.py` and
    hands `render_page` a shell. A page cannot take its own header off from the
    inside.

    The order, the coupon, the form, the words before Place order, the payment
    row and the line after it are still drawings. Each goes in when its half of
    the shop can do everything the place promises.
  */
  checkout: {
    /*
      Reduced FIRST, because it is the theme's default and what the editor has
      drawn since the slot design: every shop that sells seriously strips this
      page, and a menu, a search box and a category row are all ways out of a
      page somebody is halfway through paying on.
    */
    chrome: {
      page: "templates.checkout",
      sections: {
        reduced: { type: "checkout", settings: { chrome: "reduced" } },
        full: { type: "checkout", settings: { chrome: "full" } },
      },
    },
    footerStyle: {
      page: "templates.checkout",
      sections: {
        policies: { type: "checkout", settings: { footer: "policies" } },
        same: { type: "checkout", settings: { footer: "same" } },
        none: { type: "checkout", settings: { footer: "none" } },
      },
    },
    /*
      The same bar the cart draws, standing on the second step -- one snippet in
      the shop, because it is one bar. `none` first: it is the theme's default,
      and a bar is a claim about how long this takes.
    */
    steps: {
      page: "templates.checkout",
      sections: {
        none: { type: "checkout", settings: { steps: false } },
        bar: { type: "checkout", settings: { steps: true } },
      },
    },
    /*
      Round 2, 2026-09-24. The order column and what stands around the button.

      `order`, not `summary`: the PLACE is the editor's "summary", but what the
      section stores is what the order can still do, and a setting called
      `summary` in a document that also has a summary section would read as the
      section's own.
    */
    summary: {
      page: "templates.checkout",
      sections: {
        quantity: { type: "checkout", settings: { order: "quantity" } },
        fixed: { type: "checkout", settings: { order: "fixed" } },
      },
    },
    /*
      The code box, drawn INSIDE the summary panel on both pages -- a field
      floating under it is not where anybody looks for a discount. `open` first,
      because that is what every shop drew before this was a choice, and the
      shop still draws nothing at all where a merchant runs no codes.
    */
    coupon: {
      page: "templates.checkout",
      sections: {
        open: { type: "checkout", settings: { coupon: "open" } },
        link: { type: "checkout", settings: { coupon: "link" } },
        off: { type: "checkout", settings: { coupon: "off" } },
      },
    },
    /*
      What this order can be paid with, beside the button rather than down the
      page: near the button is where the doubt is. ON by default here and OFF on
      the cart, which is the editor's own call and a fair one -- how they will
      pay is a question a shopper is actually asking on this page.
    */
    payments: {
      page: "templates.checkout",
      sections: {
        on: { type: "checkout", settings: { payments: true } },
        off: { type: "checkout", settings: { payments: false } },
      },
    },
    /*
      Round 3, 2026-09-24: the merchant's own words, read in the second before a
      shopper pays.

      `off` FIRST -- the theme's default, and the right one: a message here is
      something a merchant chooses to say, not something a shop should start
      saying on their behalf. The words live in `before_pay_text`, one field for
      both shapes, so switching between them keeps what was written; and nothing
      is drawn at all until there are words, because an empty coloured box is a
      shop shouting with nothing to say.
    */
    beforePay: {
      page: "templates.checkout",
      sections: {
        off: { type: "checkout", settings: { before_pay: "off" } },
        note: { type: "checkout", settings: { before_pay: "note" } },
        warning: { type: "checkout", settings: { before_pay: "warning" } },
      },
      fields: ["before_pay_text"],
    },
    /*
      One line under the button, saying what happens after it is pressed. The
      shop writes the words: they have to be TRUE for this order, and a basket
      with something prepaid in it is not paid for at the door.
    */
    after: {
      page: "templates.checkout",
      sections: {
        line: { type: "checkout", settings: { after: true } },
        none: { type: "checkout", settings: { after: false } },
      },
    },
    /*
      The promises, or the merchant's own line, ABOVE the form -- which is the
      only place it can do any good: a sentence about returns read after the
      order is placed is a sentence nobody needed. The words themselves are
      picked once on the home page; `trust_text` in this section's dialog is
      what overrides them for this page, as it does on the cart.
    */
    trust: {
      page: "templates.checkout",
      sections: {
        on: { type: "checkout", settings: { trust: true } },
        off: { type: "checkout", settings: { trust: false } },
      },
      fields: ["trust_text"],
    },
  },
  /*
    The category page, 2026-09-23. The shop's widest page: most people arrive on
    a category from a search or the menu rather than on the home page.

    Three of these places are settings of ONE section -- the heading's shape and
    its count are both `category_header`, and how many across, how a shopper
    reaches the rest and what an empty category says are all `product_grid`.
    That is the first time two places have shared a section, and it is why
    `settingsDecidedOn` exists: a setting one place decides must not also be
    drawn as a field in the other's dialog.

    Sorting and filtering stay drawings for now. Both are real in the API and
    neither is in the shop yet, and a place goes in here only when its section
    can do everything the place promises.
  */
  /*
    The footer, 2026-09-24. All six places are settings of the one `footer`
    section in the footer group, so a choice here is drawn at the bottom of
    every page -- the composed footer reads the section, not this editor's
    held choices.

    Each map starts with the theme's default, so a document written before
    today reads as the shop drew it: columns, the address and phone, the social
    links as NAMES (what the shop wrote out), no payment marks, the year. It
    had a WhatsApp sign-up until the home page's band made it a second one
    (owner, 2026-09-24).
  */
  footer: {
    layout: {
      page: "footer",
      sections: {
        columns: { type: "footer", settings: { footer_layout: "columns" } },
        split: { type: "footer", settings: { footer_layout: "split" } },
        centred: { type: "footer", settings: { footer_layout: "centred" } },
        minimal: { type: "footer", settings: { footer_layout: "minimal" } },
      },
    },
    contact: {
      page: "footer",
      sections: {
        full: { type: "footer", settings: { contact: "full" } },
        email: { type: "footer", settings: { contact: "email" } },
        off: { type: "footer", settings: { contact: "off" } },
      },
    },
    social: {
      page: "footer",
      sections: {
        names: { type: "footer", settings: { social: "names" } },
        marks: { type: "footer", settings: { social: "marks" } },
        off: { type: "footer", settings: { social: "off" } },
      },
    },
    payments: {
      page: "footer",
      sections: {
        off: { type: "footer", settings: { payments: false } },
        on: { type: "footer", settings: { payments: true } },
      },
    },
    bottom: {
      page: "footer",
      sections: {
        copyright: { type: "footer", settings: { bottom: "copyright" } },
        policies: { type: "footer", settings: { bottom: "policies" } },
      },
    },
  },
  /*
    The blog, 2026-09-24. Seven places are settings of the one `blog_list`
    section every document holds -- the widest sharing yet, which is why a
    place can now claim its own words (`fields`): the blog's name and opening
    line belong to the heading and are drawn in no other dialog. The eighth,
    words under the posts, is the `rich_text` section, exactly as on the
    category page.

    Each map starts with the theme's default, so a document written before
    today reads as the shop drew it: the name on, no search box, no tags, ONE
    featured post large (the editor used to call four across "what your shop
    does today", and it was not), a grid, picture and first line, the date.
  */
  blog: {
    heading: {
      page: "templates.blog",
      sections: {
        on: { type: "blog_list", settings: { heading: true } },
        off: { type: "blog_list", settings: { heading: false } },
      },
      fields: ["title", "intro"],
    },
    search: {
      page: "templates.blog",
      sections: {
        off: { type: "blog_list", settings: { search: false } },
        on: { type: "blog_list", settings: { search: true } },
      },
    },
    tags: {
      page: "templates.blog",
      sections: {
        off: { type: "blog_list", settings: { tags: false } },
        row: { type: "blog_list", settings: { tags: true } },
      },
    },
    featured: {
      page: "templates.blog",
      sections: {
        hero: { type: "blog_list", settings: { featured: "hero" } },
        shelf: { type: "blog_list", settings: { featured: "shelf" } },
        off: { type: "blog_list", settings: { featured: "off" } },
      },
    },
    latest: {
      page: "templates.blog",
      sections: {
        grid: { type: "blog_list", settings: { latest: "grid" } },
        rows: { type: "blog_list", settings: { latest: "rows" } },
      },
    },
    cards: {
      page: "templates.blog",
      sections: {
        full: { type: "blog_list", settings: { cards: "full" } },
        picture: { type: "blog_list", settings: { cards: "picture" } },
        words: { type: "blog_list", settings: { cards: "words" } },
      },
    },
    meta: {
      page: "templates.blog",
      sections: {
        date: { type: "blog_list", settings: { meta: "date" } },
        reads: { type: "blog_list", settings: { meta: "reads" } },
        none: { type: "blog_list", settings: { meta: "none" } },
      },
    },
    text: { page: "templates.blog", sections: { block: "rich_text" }, off: "off" },
  },
  /*
    Search, 2026-09-24. Every place is a setting of the one section the page
    has always had, so a document written before today reads as the shop drew
    it: each map starts with the theme's default, and a missing setting reads
    as the first value that wants it.

    Three of these decide what the VIEW does and not only what is drawn --
    whether the matching categories are looked up, which page of results is
    read, and whether the best sellers are fetched for an empty box -- so the
    shop reads them in `views/pages.search` before it queries anything.
  */
  /*
    A blog post, 2026-09-24. Six of its places are settings of the one
    `article_body` section -- none of them `off`, which would HIDE the post --
    and the seventh, More posts, is the `article_related` section being there
    or not. The theme's default comes first in each map.
  */
  article: {
    back: {
      page: "templates.blog_article",
      sections: {
        on: { type: "article_body", settings: { back: true } },
        off: { type: "article_body", settings: { back: false } },
      },
    },
    head: {
      page: "templates.blog_article",
      sections: {
        under: { type: "article_body", settings: { picture: "under" } },
        top: { type: "article_body", settings: { picture: "top" } },
        off: { type: "article_body", settings: { picture: "off" } },
      },
    },
    byline: {
      page: "templates.blog_article",
      sections: {
        date: { type: "article_body", settings: { byline: "date" } },
        author: { type: "article_body", settings: { byline: "author" } },
        none: { type: "article_body", settings: { byline: "none" } },
      },
    },
    body: {
      page: "templates.blog_article",
      sections: {
        narrow: { type: "article_body", settings: { width: "narrow" } },
        wide: { type: "article_body", settings: { width: "wide" } },
      },
    },
    tags: {
      page: "templates.blog_article",
      sections: {
        on: { type: "article_body", settings: { tags: true } },
        off: { type: "article_body", settings: { tags: false } },
      },
    },
    prevNext: {
      page: "templates.blog_article",
      sections: {
        on: { type: "article_body", settings: { prev_next: true } },
        off: { type: "article_body", settings: { prev_next: false } },
      },
    },
    related: { page: "templates.blog_article", sections: { on: "article_related" }, off: "off" },
  },
  search: {
    heading: {
      page: "templates.search",
      sections: {
        withCount: { type: "search_results", settings: { heading: "count" } },
        plain: { type: "search_results", settings: { heading: "plain" } },
      },
    },
    /*
      A boolean like the account's reviews, and no `off` key for the same
      reason: `off` there would hide the whole section, results and all.
    */
    categories: {
      page: "templates.search",
      sections: {
        on: { type: "search_results", settings: { categories: true } },
        off: { type: "search_results", settings: { categories: false } },
      },
    },
    grid: {
      page: "templates.search",
      sections: {
        four: { type: "search_results", settings: { columns: "four" } },
        three: { type: "search_results", settings: { columns: "three" } },
        two: { type: "search_results", settings: { columns: "two" } },
      },
    },
    /*
      `none` first: the theme's default, and what the shop did before this was
      a choice. The category page's default is `pages`; search's is not,
      because a shop's answer to one word is rarely longer than a page.
    */
    more: {
      page: "templates.search",
      sections: {
        none: { type: "search_results", settings: { more: "none" } },
        button: { type: "search_results", settings: { more: "button" } },
        pages: { type: "search_results", settings: { more: "pages" } },
      },
    },
    empty: {
      page: "templates.search",
      sections: {
        text: { type: "search_results", settings: { when_empty: "text" } },
        invite: { type: "search_results", settings: { when_empty: "invite" } },
      },
    },
    prompt: {
      page: "templates.search",
      sections: {
        hint: { type: "search_results", settings: { prompt: "hint" } },
        trending: { type: "search_results", settings: { prompt: "trending" } },
      },
    },
  },
  category: {
    breadcrumb: { page: "templates.category", sections: { on: "breadcrumb" }, off: "off" },
    /*
      The heading's three shapes: the plain name, the name with a small label
      above it, the name over the category's own picture. One section with a
      `layout`, like the category band and the promotion -- the merchant is
      choosing how their heading LOOKS, and two sections would let them put both
      on the page.
    */
    heading: {
      page: "templates.category",
      sections: {
        plain: { type: "category_header", settings: { layout: "plain" } },
        eyebrow: { type: "category_header", settings: { layout: "eyebrow" } },
        banner: { type: "category_header", settings: { layout: "banner" } },
      },
    },
    /*
      "24 products" under the name, which is the same section as the heading.

      **The theme's own default value comes first**, here and in every place
      below whose values are settings of one section: a document written before
      the setting existed carries none, and `slotValueFor` reads a missing
      setting as the first value that wants it. Put `on` first and a shop that
      has never touched this would read as showing a count it does not show.

      No `off` key: switching the count off is a setting, not an absent section.
      `off` there would hide the heading itself.
    */
    count: {
      page: "templates.category",
      sections: {
        off: { type: "category_header", settings: { show_count: false } },
        on: { type: "category_header", settings: { show_count: true } },
      },
    },
    /*
      How a shopper reorders the list. `off` first, like every place whose
      values are settings of one section: it is the theme's default, and a
      missing setting reads as the first value that wants it.

      Whether a shopper's `?sort=` is honoured AT ALL is this setting -- with no
      control drawn, a typed order would reorder page one while the numbered
      pages under it dropped it again.
    */
    sort: {
      page: "templates.category",
      sections: {
        off: { type: "product_grid", settings: { sort: "off" } },
        menu: { type: "product_grid", settings: { sort: "menu" } },
        tabs: { type: "product_grid", settings: { sort: "tabs" } },
      },
    },
    /*
      What a shopper can narrow the list by. `off` first, like every other place
      whose values are settings of one section.

      The VALUES are never the theme's: they are whatever that category's own
      products have, read per category so a Footwear page never offers a brand
      that would return nothing. Nothing to choose here but the shape.
    */
    filters: {
      page: "templates.category",
      sections: {
        off: { type: "product_grid", settings: { filters: "off" } },
        chips: { type: "product_grid", settings: { filters: "chips" } },
        rail: { type: "product_grid", settings: { filters: "rail" } },
      },
    },
    grid: {
      page: "templates.category",
      sections: {
        four: { type: "product_grid", settings: { columns: "four" } },
        three: { type: "product_grid", settings: { columns: "three" } },
        two: { type: "product_grid", settings: { columns: "two" } },
      },
    },
    more: {
      page: "templates.category",
      sections: {
        pages: { type: "product_grid", settings: { more: "pages" } },
        button: { type: "product_grid", settings: { more: "button" } },
        none: { type: "product_grid", settings: { more: "none" } },
      },
    },
    text: { page: "templates.category", sections: { block: "rich_text" }, off: "off" },
    /*
      `when_empty`, not `empty`: `empty` is a reserved word in Liquid, so a
      setting named it is a path no template can write -- the product grid
      raised rather than drawing. Renamed in theming migration 0024.
    */
    empty: {
      page: "templates.category",
      sections: {
        text: { type: "product_grid", settings: { when_empty: "text" } },
        invite: { type: "product_grid", settings: { when_empty: "invite" } },
      },
    },
  },
};

/**
 * Every setting the places on one page DECIDE for themselves, for one section.
 *
 * A place whose choices are shapes of one section sets that shape by the tiles
 * at the top, so drawing the same setting again as a field below them is one
 * decision with two controls -- which is what the owner met on 2026-09-23.
 *
 * It has to be the whole page rather than the one place, because the category
 * page is the first where two places share a section: the heading's shape and
 * its count are both `category_header`. Asking only the open place would draw
 * the count as a field under the heading's tiles, and the shape as a dropdown
 * under the count's -- each place offering the other's decision.
 */
export function settingsDecidedOn(page: SlotPageKey, sectionType: string): Set<string> {
  const decided = new Set<string>();
  for (const slot of SLOTS[page] ?? []) {
    const wiring = wiringFor(ownerOf(page, slot).page, ownerOf(page, slot).key);
    if (!wiring) continue;
    for (const value of Object.keys(wiring.sections)) {
      const meaning = meaningOf(wiring, value)!;
      if (meaning.type === sectionType) {
        for (const setting of Object.keys(meaning.settings)) decided.add(setting);
      }
    }
  }
  return decided;
}

/**
 * The settings OTHER places on this page have claimed as their own words, for
 * one section -- so a dialog does not draw them. See `WiredSlot.fields`.
 */
export function settingsClaimedElsewhere(
  page: SlotPageKey,
  sectionType: string,
  owner: { page: SlotPageKey; key: string },
): Set<string> {
  const claimed = new Set<string>();
  for (const slot of SLOTS[page] ?? []) {
    const other = ownerOf(page, slot);
    if (other.page === owner.page && other.key === owner.key) continue;
    const wiring = wiringFor(other.page, other.key);
    if (!wiring?.fields) continue;
    if (!sectionTypesOf(wiring).includes(sectionType)) continue;
    for (const setting of wiring.fields) claimed.add(setting);
  }
  return claimed;
}

/**
 * Where a place's value actually lives.
 *
 * Most places are their own: the Home page's hero is the Home page's. Some are
 * drawn on every page and owned by one entry -- the notice strip is drawn
 * everywhere and owned by Header -- and `inheritedFrom` on the catalogue says
 * which. Everything that reads or writes a place has to ask this first, or the
 * notice a merchant clicked on Home is looked up under Home, where there is
 * nothing.
 */
export function ownerOf(page: SlotPageKey, slot: Slot): { page: SlotPageKey; key: string } {
  return slot.inheritedFrom ?? { page, key: slot.key };
}

/** What this place is in the document, or null when it is still a drawing. */
export function wiringFor(page: SlotPageKey, slotKey: string): WiredSlot | null {
  return WIRED_SLOTS[page]?.[slotKey] ?? null;
}

/** What one of this place's values means: a section type and the settings for it. */
export function meaningOf(
  wiring: WiredSlot,
  value: string,
): { type: string; settings: Record<string, unknown> } | null {
  const held = wiring.sections[value];
  if (!held) return null;
  return typeof held === "string" ? { type: held, settings: {} } : held;
}

/** The section types this place can hold, each once. */
export function sectionTypesOf(wiring: WiredSlot): string[] {
  return [
    ...new Set(
      Object.keys(wiring.sections).map((value) => meaningOf(wiring, value)!.type),
    ),
  ];
}

/** The section of one type in this place's list, or null when the document has none. */
export function sectionOfType(
  document: ThemeDocument,
  wiring: WiredSlot,
  type: string,
): ThemeSection | null {
  return pageSections(document, wiring.page).find((section) => section.type === type) ?? null;
}

/**
 * The section this place is showing, or null when it shows nothing.
 *
 * Null is a real answer, not a bug: a document written before a section existed
 * simply does not carry it, and the shop draws its theme's default instead.
 */
export function sectionFor(document: ThemeDocument, wiring: WiredSlot): ThemeSection | null {
  for (const type of sectionTypesOf(wiring)) {
    const section = sectionOfType(document, wiring, type);
    if (section && !section.hidden) return section;
  }
  return null;
}

/**
 * Which of this place's values the document is holding.
 *
 * The first section actually SHOWN wins. A place with nothing shown reads as off
 * where the place offers one, and otherwise as its first value -- a hero with no
 * pictures is still the pictures hero, waiting for one.
 */
export function slotValueFor(document: ThemeDocument, wiring: WiredSlot): string {
  for (const value of Object.keys(wiring.sections)) {
    const meaning = meaningOf(wiring, value)!;
    const section = sectionOfType(document, wiring, meaning.type);
    if (!section || section.hidden) continue;
    // Where two values are the same section shaped differently, the settings
    // are what tell them apart -- and a document written before a setting
    // existed carries none, so a missing one reads as the theme's default
    // rather than as neither value.
    const matches = Object.entries(meaning.settings).every(
      ([key, wanted]) =>
        section.settings?.[key] === wanted || section.settings?.[key] === undefined,
    );
    if (matches) return value;
  }
  return wiring.off ?? Object.keys(wiring.sections)[0];
}

/**
 * Where a place's section goes when the page does not have one yet.
 *
 * **After the last section belonging to a place ABOVE it on the canvas.**
 * The canvas order is the page order -- that is the whole idea of the slot
 * design -- so the category band goes under the hero, not below everything. It landed at
 * the end until 2026-09-22, which was the right default while a merchant could
 * drag it afterwards and is simply wrong now that nothing drags.
 *
 * A page with none of those sections yet puts it first, which is as near its own
 * place as an empty page allows.
 */
export function placeFor(
  document: ThemeDocument,
  page: SlotPageKey,
  slotKey: string,
  wiring: WiredSlot,
): number {
  const above = new Set<string>();
  for (const slot of SLOTS[page] ?? []) {
    if (slot.key === slotKey) break;
    const earlier = wiringFor(page, slot.key);
    if (earlier) for (const type of sectionTypesOf(earlier)) above.add(type);
  }

  const sections = pageSections(document, wiring.page);
  let at = 0;
  sections.forEach((section, index) => {
    if (above.has(section.type)) at = index + 1;
  });
  return at;
}

/**
 * The edits one click on a wired place makes, in order.
 *
 * Every edit starts by picking the list it belongs to. The reducer works on the
 * page it is holding -- that is what makes "remove this section" mean anything
 * -- and the canvas's own page picker is a different thing: a merchant editing
 * the notice is looking at the Home page, while the notice lives in the header
 * group. Without this, the edit went to the page on screen, found no bar there,
 * and changed nothing at all. Silently.
 *
 * Returned rather than dispatched so the editor and its tests take the same
 * path: a test that hand-writes the sequence proves the sequence it wrote.
 */
export function choiceEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  value: string,
  /** Where this place sits on the canvas, so a new section lands there. */
  where: { page: SlotPageKey; key: string },
): EditorAction[] {
  const { page, key: slotKey } = where;
  const meaning = meaningOf(wiring, value);
  const wanted = meaning?.type ?? null;
  const edits: EditorAction[] = [{ type: "pickPage", page: wiring.page }];

  // Everything this place could be, hidden unless it is the one chosen. Hidden,
  // never removed: a merchant who tries the video and comes back must still have
  // the pictures they had, and a strip switched off for a week must not cost
  // them their words.
  for (const type of sectionTypesOf(wiring)) {
    const section = sectionOfType(document, wiring, type);
    if (!section) continue;
    if (type === wanted) {
      if (section.hidden) edits.push({ type: "show", id: section.id });
    } else if (!section.hidden) {
      edits.push({ type: "hide", id: section.id });
    }
  }

  // A document written before this section existed simply does not carry it. A
  // merchant asking for the hero means the hero, not an explanation. It is born
  // with the settings that make it THIS value, rather than added and then set:
  // its id is the reducer's to mint, so nothing out here could name it anyway.
  const existing = wanted ? sectionOfType(document, wiring, wanted) : null;
  if (wanted && !existing) {
    edits.push({
      type: "add",
      sectionType: wanted,
      settings: meaning?.settings,
      at: placeFor(document, page, slotKey, wiring),
    });
  }

  // And where the section is already there, the settings that reshape it: the
  // category band becomes a row of names by its `layout`, not by a second
  // section.
  if (existing) {
    for (const [setting, next] of Object.entries(meaning?.settings ?? {})) {
      if (existing.settings?.[setting] !== next) {
        edits.push({ type: "setSetting", id: existing.id, setting, value: next });
      }
    }
  }

  return edits.length > 1 ? edits : [];
}

/** The edits one setting of the section this place is showing makes. */
export function settingEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  setting: string,
  value: unknown,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "setSetting", id: section.id, setting, value },
  ];
}

/**
 * The parts a place's dialog lists, adds and orders.
 *
 * The kind is the one the place's wiring names (`WiredSlot.blocks`), or the
 * only kind its section has -- a picture, a question. A section with several
 * kinds and no name given (the buying column, seen from the phone buy bar)
 * offers no parts at all: taking the first kind there offered to add a second
 * product name.
 *
 * `stepTo` is where a part lands when it moves one step, as a position in the
 * WHOLE section, which is what a move is applied to -- only this place's parts
 * are listed, and the column's fixed parts sit among them.
 */
export function placeParts(
  section: ThemeSection | null | undefined,
  kinds: string[],
  wiring: WiredSlot,
): {
  blockType: string | undefined;
  blocks: ThemeSection["blocks"];
  every: ThemeSection["blocks"];
  stepTo: (index: number, step: -1 | 1) => number;
} {
  const blockType = wiring.blocks ?? (kinds.length === 1 ? kinds[0] : undefined);
  const every = section?.blocks ?? [];
  const blocks = blockType ? every.filter((block) => block.type === blockType) : [];
  return {
    blockType,
    blocks,
    every,
    stepTo: (index, step) => every.findIndex((block) => block.id === blocks[index + step]?.id),
  };
}

/** The edits one setting of one PART of that section makes -- a hero picture, say. */
export function blockSettingEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockId: string,
  setting: string,
  value: unknown,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "setSetting", id: section.id, blockId, setting, value },
  ];
}

/** Add one part to the section this place is showing: a picture, a question. */
export function addBlockEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockType: string,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "addBlock", id: section.id, blockType },
  ];
}

/** Take one part off. */
export function removeBlockEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockId: string,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "removeBlock", id: section.id, blockId },
  ];
}

/**
 * Every part of this place at once, from a list of values for one setting.
 *
 * The featured band is picked by ticking a list, not by adding eight parts and
 * filling each one in (owner, 2026-09-23). One action, so one document reaches
 * autosave rather than eight.
 */
export function setBlocksEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockType: string,
  setting: string,
  values: string[],
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "setBlocks", id: section.id, blockType, setting, values },
  ];
}

/** Move one part up or down. Buttons, not dragging (owner, 2026-09-22). */
export function moveBlockEdits(
  document: ThemeDocument,
  wiring: WiredSlot,
  blockId: string,
  to: number,
): EditorAction[] {
  const section = sectionFor(document, wiring);
  if (!section) return [];
  return [
    { type: "pickPage", page: wiring.page },
    { type: "moveBlock", id: section.id, blockId, to },
  ];
}
