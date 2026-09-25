"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  Banknote,
  BadgeCheck,
  CalendarCheck,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  Gift,
  Hash,
  Headphones,
  Heart,
  Info,
  Leaf,
  Lock,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  Ruler,
  Search,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Truck,
  Upload,
  User,
  WashingMachine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FieldOption } from "@/lib/theme-editor/field-specs";

/**
 * The mark each promise is drawn with ON THE CANVAS.
 *
 * The shop draws the same sixteen with Phosphor, because that is the theme's
 * icon set; this is the editor's, which is lucide. Two maps of one idea, and
 * they cannot be one: a React component and a Liquid snippet do not share an
 * icon. What they DO share is the sixteen names, which come from the theme's
 * manifest -- so a promise added there and missed here draws `Sparkles` rather
 * than nothing, and the canvas stays whole.
 */
const PROMISE_MARKS: Record<string, LucideIcon> = {
  fast_delivery: Truck,
  free_delivery: Gift,
  dhaka_24_hours: Clock,
  all_over_bangladesh: MapPin,
  cash_on_delivery: Banknote,
  secure_payment: Lock,
  mobile_payment: Smartphone,
  pay_your_way: CreditCard,
  easy_returns: RotateCcw,
  exchange_in_7_days: CalendarCheck,
  check_before_paying: Eye,
  genuine_product: BadgeCheck,
  quality_checked: CheckCircle,
  warranty_included: ShieldCheck,
  help_every_day: Headphones,
  reply_within_an_hour: MessageCircle,
};

/**
 * The mark each fold-out row of the product page is drawn with on the canvas:
 * the names the theme's `product_details.row.icon` offers, in the editor's icon
 * set -- two maps of one idea, for the reason the promises give above. An icon
 * the theme adds and this misses draws `Info` rather than nothing.
 */
const ROW_MARKS: Record<string, LucideIcon> = {
  info: Info,
  "washing-machine": WashingMachine,
  ruler: Ruler,
  "t-shirt": Shirt,
  leaf: Leaf,
  "shield-check": ShieldCheck,
  package: Package,
  truck: Truck,
  "arrows-left-right": ArrowLeftRight,
  gift: Gift,
};

import type { PostWord } from "@/lib/theme-editor/post-words";
import type { ThemeSection } from "@/lib/theme-editor/api";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import SocialLinkGlyph from "@/app/[locale]/(dashboard)/settings/sections/SocialLinkGlyph";
import type { StoreSocialLinkKey } from "@/lib/storeSocialLinks";
import type { SlotPageKey } from "@/lib/theme-editor/slot-catalogue";

/**
 * What a slot actually shows, drawn as the shop rather than as a grey box.
 *
 * The canvas IS the editor -- there is no list beside it -- so a merchant has to
 * recognise the thing they are about to click. A row of wireframe bars would not
 * be recognisable; a masthead with the shop's name in it is.
 *
 * **Drawn to be read, not to be small.** These were once a third of this size
 * and the complaint was fair: a preview you have to lean in to identify is not
 * doing its job. Real product names, real prices, real headings, at sizes that
 * survive a 60% column.
 *
 * Everything here is scenery. It carries no state and no behaviour: the slot
 * wrapper in `SlotCanvas` owns the clicking.
 */

function Line({ w = "100%", h = 6 }: { w?: string; h?: number }) {
  return <span className="block rounded-full bg-current/12" style={{ width: w, height: h }} />;
}

function SectionHead({ title, link, band = false }: { title: string; link?: string; band?: boolean }) {
  if (band) {
    // A band's title on the HOME page, drawn as the shop draws it since
    // 2026-09-25 (`band-heading`): centred, in capitals, light, no extra
    // letter-spacing, with its link centred underneath. A band the merchant
    // left untitled still has its link, as it does on the shop.
    return (
      <div className="mb-3 flex flex-col items-center gap-1 text-center">
        {title ? <h4 className="m-0 text-[19px] font-light uppercase">{title}</h4> : null}
        {link ? <span className="text-[10px] uppercase tracking-[0.08em] text-current/45">{link}</span> : null}
      </div>
    );
  }
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h4 className="m-0 text-[15px] font-semibold">{title}</h4>
      {link ? <span className="text-[10px] uppercase tracking-[0.08em] text-current/45">{link}</span> : null}
    </div>
  );
}

/**
 * The product card, which eight slots on five pages draw with.
 *
 * It carries what a card has to carry to be worth a merchant's shelf space: a
 * picture, the name, the price, and -- where there is one -- the price it used
 * to be with the saving marked on the picture. Improving this one function is
 * what lifts featured, best sellers, new arrivals, related, recently viewed and
 * the cart's upsell all at once.
 */
type Card = { name: string; price: string; was?: string; off?: number };

function Cards({ items, ratio = "1" }: { items: Card[]; ratio?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.name} className="min-w-0">
          <div className="relative overflow-hidden rounded-md bg-current/8" style={{ aspectRatio: ratio }}>
            {item.off ? (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-[#d64545] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                −{item.off}%
              </span>
            ) : null}
          </div>
          <p className="mt-2 truncate text-[11.5px] font-medium">{item.name}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[12.5px] font-semibold tabular-nums">{item.price}</span>
            {item.was ? (
              <span className="text-[10px] tabular-nums text-current/35 line-through">{item.was}</span>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  );
}

const FEATURED: Card[] = [
  { name: "Gradient Graphic T-shirt", price: "৳1,450", was: "৳2,400", off: 40 },
  { name: "Oxford Button-Down", price: "৳2,150" },
  { name: "Linen Overshirt", price: "৳2,890", was: "৳3,400", off: 15 },
  { name: "Corduroy Shirt", price: "৳1,990" },
];

const BESTSELLERS: Card[] = [
  { name: "Crossbody Bag", price: "৳1,250" },
  { name: "Canvas Tote", price: "৳980", was: "৳1,400", off: 30 },
  { name: "Leather Belt", price: "৳890" },
  { name: "Card Wallet", price: "৳650" },
];

const POSTS = [
  { title: "How we choose leather", excerpt: "Six tanneries, one that answers the phone.", tag: "Materials" },
  { title: "Caring for canvas in the rain", excerpt: "Dhaka in July is a test no lab can run.", tag: "Care" },
  { title: "Behind the seams", excerpt: "A day with the people who cut and stitch.", tag: "Workshop" },
  { title: "Why our hardware never changed", excerpt: "Six years, and nothing has worn out yet.", tag: "Materials" },
];

/** One post as the blog's drawings need it: this shop's own, or an example. */
export type PostPreview = {
  title: string;
  excerpt: string;
  /** Its first tag, or "" -- never an invented one. */
  tag: string;
  /** When it went up, already written in the merchant's language. */
  date: string;
  reads: number;
  featured: boolean;
  /** Every tag on it, first first. The blog-post page's tag row. */
  tags: string[];
  /** Whether a picture is uploaded: a post without one shows its title only. */
  pictured: boolean;
  /** The writer's name as the shop prints it -- never the email -- or "". */
  author: string;
  /** Its first few blocks, as words. See `postWords`. */
  words: PostWord[];
};

/**
 * This shop's own posts and tags, handed in by the editor.
 *
 * The blog's drawings are its OWN posts since 2026-09-24: a merchant reading
 * "How we choose leather" on a shop that sells phones cannot tell their blog
 * from a brochure, and "Care" and "Materials" are tags no shop of theirs ever
 * had -- the same complaint as an invented category. Only published posts,
 * because those are the ones a shopper sees.
 */
export type BlogPreview = { posts: PostPreview[]; tags: string[] };

/**
 * The home page's brands and reviews, as the shop picks them (2026-09-24).
 *
 * Handed in by the editor, like the posts: "Nusrat J." and six grey logos were
 * nobody's shop. The brands are the ones with the most products, active ones
 * only; the reviews are the newest published ones with four or five stars and
 * something written -- the shop's own rule, so the drawing and the page agree.
 */
export type BrandPreview = { name: string; logo: boolean };
export type ReviewPreview = { name: string; rating: number; body: string; product: string; byShop: boolean };

/**
 * This shop's own details, for the footer: what Settings holds, as the shop
 * draws it.
 *
 * The footer used to be drawn as "Gadzilla, 12 Gulshan Avenue, +880 1700
 * 000000" with pages called Careers and Wholesale for every merchant -- a
 * footer no shop of theirs has. Only what is filled in is drawn, as on the
 * shop, and the links that depend on a switch follow the switch.
 */
export type ShopIdentity = {
  name: string;
  address: string;
  phone: string;
  email: string;
  /** The filled social links only, in the shop's order: facebook, instagram, whatsapp, tiktok. */
  social: StoreSocialLinkKey[];
  wishlist: boolean;
  orderLookup: boolean;
};

/**
 * Post cards, drawn the way the blog's own two settings say.
 *
 * The shelves do not own this: `cards` decides what a card carries and `line`
 * the words under it -- a date, a read count, or nothing -- and both are chosen
 * on their own bands. Passing them through is what lets a merchant change the
 * card shape and watch every shelf on the page change with it.
 */
function PostCards({
  posts,
  cards,
  line,
  columns = 4,
}: {
  posts: PostPreview[];
  cards: string;
  line: (post: PostPreview) => string | null;
  /** Four across on the blog; three for the shelf under a post. */
  columns?: 3 | 4;
}) {
  return (
    <div className={`grid grid-cols-2 gap-3.5 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
      {posts.map((post) => {
        const under = line(post);
        return (
          <div key={post.title} className="min-w-0">
            {cards === "words" ? null : (
              <div className="relative overflow-hidden rounded-md bg-current/8 aspect-[4/3]" aria-hidden>
                {post.tag ? (
                  <span className="absolute left-2 top-2 rounded-full bg-[color:var(--color-background)]/85 px-2 py-0.5 text-[9px] font-medium text-current/70">
                    {post.tag}
                  </span>
                ) : null}
              </div>
            )}
            {/* A words-only card has nothing to lean on, so it gets a rule and the
                tag it would otherwise have worn on the picture. */}
            {cards === "words" ? (
              <p className="mb-1.5 border-t-2 border-current/20 pt-2 text-[9px] uppercase tracking-[0.1em] text-current/45">
                {post.tag}
              </p>
            ) : null}
            <p className={`${cards === "words" ? "" : "mt-2.5"} text-[12.5px] font-semibold leading-snug`}>
              {post.title}
            </p>
            {cards === "picture" ? null : (
              <p className="mt-1 text-[10.5px] leading-relaxed text-current/50">{post.excerpt}</p>
            )}
            {under ? <p className="mt-1.5 text-[10px] text-current/40">{under}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

const ARRIVALS: Card[] = [
  { name: "Merino Scarf", price: "৳1,180" },
  { name: "Wool Cap", price: "৳740" },
  { name: "Suede Loafer", price: "৳3,600", was: "৳4,200", off: 15 },
  { name: "Cotton Socks", price: "৳320" },
];

/**
 * The example shopper's face on the account page's welcome card. A fixed seed,
 * so the drawing does not change between visits; the shop seeds each real
 * account by its random id.
 */
const EXAMPLE_SHOPPER_SEED = "example-shopper";

/** The mock shop, one slot at a time. `variant` is whatever the merchant chose. */
export function ShopChrome({
  page,
  slotKey,
  variant,
  settings,
  live,
  pictureUrl,
  departments,
  promiseWords,
  blog,
  shop,
  brands,
  reviews,
}: {
  page: SlotPageKey;
  slotKey: string;
  variant: string | undefined;
  /**
   * Every setting of the group this slot belongs to, when it is drawing the
   * whole of one -- the header or the footer.
   *
   * Without it the composed footer drew its arrangement and ignored the other
   * five settings, so a merchant switched the sign-up on, went to look at a
   * page, and found nothing there. A preview that answers only some of the
   * questions put to it is worse than one that answers none, because it is
   * believed.
   */
  settings?: Record<string, string>;
  /**
   * A WIRED place's own SECTION, straight from the shop's document -- settings
   * and the parts inside it.
   *
   * The drawing is a drawing everywhere else, and says so; where a place is
   * real, it draws the merchant's own words and pictures instead of an example.
   * The two are separate on purpose: `settings` is this editor's held choices,
   * `live` is the shop's document, and reading one as the other is how a
   * preview starts lying.
   *
   * The whole section rather than its settings, because the hero's pictures are
   * its BLOCKS -- a place that is a list needs the list.
   */
  live?: ThemeSection;
  /** A picture key this shop uploaded, to the URL it draws from. */
  pictureUrl?: (key: string) => string;
  /**
   * This shop's own top-level departments, for the bands that draw them.
   *
   * The canvas cannot read the shop's catalogue the way the storefront does, so
   * this is handed in; empty falls back to examples rather than to a blank band.
   * The same list the three-department place is picked from -- one list, so the
   * drawing and the pop-up can never offer different aisles.
   */
  departments?: FieldOption[];
  /**
   * A promise's name to the words a merchant reads, from the theme's own list.
   *
   * The canvas has no translations of its own for these: the sixteen are the
   * THEME's, labelled in both languages in its manifest, and the shop says them
   * to a shopper in the shopper's language. Handed in so both readings come
   * from one place.
   */
  promiseWords?: (name: string) => string;
  /** This shop's own posts and tags. See `BlogPreview`. */
  blog?: BlogPreview;
  /** This shop's own name, contact and links. See `ShopIdentity`. */
  shop?: ShopIdentity;
  /** This shop's brands and good reviews, for the home page. See `BrandPreview`. */
  brands?: BrandPreview[];
  reviews?: ReviewPreview[];
}) {
  const t = useTranslations("themeEditor.slots");

  /*
    The blog's posts: this shop's own where it has any. A shop with none yet
    gets the examples WITHOUT their tags -- a card has to show something
    card-shaped, but a tag is a group the merchant never made.
  */
  const shopPosts: PostPreview[] = blog?.posts.length
    ? blog.posts
    : POSTS.map((post) => ({
        ...post,
        tag: "",
        date: "12 Sep 2026",
        reads: 1240,
        featured: false,
        tags: [],
        pictured: true,
        author: "",
        words: [],
      }));
  /*
    The post the blog-post page stands for: the shop's second newest where it
    has three or more, so the posts either side can both be drawn -- the newest
    has nothing after it, the oldest nothing before.
  */
  const article = shopPosts[shopPosts.length > 2 ? 1 : 0];
  const articleAt = shopPosts.indexOf(article);
  /** A blog setting as the shop's document holds it, else this editor's choice. */
  const blogChoice = (key: string, fallback: string) => {
    const held = live?.settings?.[key];
    return typeof held === "string" ? held : (settings?.[key] ?? fallback);
  };
  /** A wired band's own heading, as the merchant wrote it, or "". */
  const liveHeading = typeof live?.settings?.heading === "string" ? live.settings.heading.trim() : "";
  const postLine = (meta: string) => (post: PostPreview) =>
    meta === "reads" ? t("blogReadsExample", { count: post.reads }) : meta === "none" ? null : post.date || null;

  /*
    The category page is a TEMPLATE, not a page: one drawing stands for every
    category the shop has. It stands for them as the merchant's own first
    department wherever there is one -- a merchant reading about somebody
    else's aisle cannot tell whether this is their shop or a brochure -- and as
    a plain example only for a shop that has no departments yet.
  */
  const exampleCategory = departments?.[0]?.label || t("catExampleCategory");

  /*
    What the search page pretends somebody typed.

    A department of this shop's own, because that is a thing shoppers really do
    search for -- the Matching-categories place exists for exactly that -- and
    because "bag" belonged to no shop on this platform. A shop with no
    departments yet gets plain words rather than an invented product.
  */
  const exampleTerm = departments?.[0]?.label || t("searchExampleTerm");

  // The announcement and the masthead are drawn by key rather than by page:
  // both live in the header group, so every page shows them and only the Header
  // entry in the picker edits them.
  if (slotKey === "notice") {
    // The merchant's own line when this place is wired, an example when it is
    // not -- and an example again when they have not written one yet, because a
    // strip drawn empty reads as a bug rather than as a blank.
    // One ground, not a choice: the owner took the colour setting off the bar
    // on 2026-09-22, because the palette already decides what the accent is --
    // so it is drawn in the palette's brand colour, as the shop's strip is.
    const text = live?.settings?.text;
    const written = typeof text === "string" ? text.trim() : "";
    return (
      <p className="border-b border-border bg-shop-brand px-4 py-2 text-center text-[11px] uppercase tracking-[0.06em] text-shop-brand-foreground/85">
        {written || t("noticeExample")}
      </p>
    );
  }

  /*
    The header, WIRED 2026-09-24 like the footer: its choices are the header
    section's settings, read from `live` -- the shop's document -- and only
    from this editor's held choices where there is no section to read. `force`
    is the value an open place is showing. Drawn with the shop's own name and
    departments; it drew "GADZILLA" and five invented aisles for every shop.
  */
  const headerDrawing = (force: { layout?: string; search?: string; marks?: string } = {}) => {
    const held = live?.type === "header" ? (live.settings ?? {}) : {};
    const layout =
      force.layout ?? (typeof held.header_layout === "string" ? held.header_layout : (settings?.layout ?? "bar"));
    const search = force.search ?? (typeof held.search === "string" ? held.search : (settings?.search ?? "box"));
    const marksOn =
      (force.marks ??
        (typeof held.show_account_links === "boolean"
          ? held.show_account_links
            ? "on"
            : "off"
          : (settings?.marks ?? "off"))) === "on";
    // The account mark always (every shop has accounts), the wishlist only
    // where it is switched on, and the cart.
    const marks = marksOn ? (shop && !shop.wishlist ? 2 : 3) : 1;
    const name = (shop?.name || t("footerShopName")).toUpperCase();
    const aisles = departments?.length ? departments.map((one) => one.label) : [t("catExampleCategory")];
    const logo = <span className="text-sm font-semibold tracking-[0.14em]">{name}</span>;
    const box = <span className="h-7 min-w-0 flex-1 rounded-xs bg-current/12" />;
    const searchMark = <span className="size-4 rounded-full border border-current/35" />;
    const icons = (
      <span className="flex shrink-0 items-center gap-2.5">
        {search === "icon" ? searchMark : null}
        {Array.from({ length: marks }, (_, i) => (
          <span key={i} className="size-4 rounded-xs bg-current/25" />
        ))}
      </span>
    );
    const nav = (centred: boolean, count?: number) => (
      <div
        className={`flex gap-4 overflow-hidden px-4 py-2.5 text-[10px] uppercase tracking-[0.08em] text-current/50 ${
          centred ? "justify-center" : ""
        }`}
      >
        {(count ? aisles.slice(0, count) : aisles).map((aisle) => (
          <span key={aisle} className="shrink-0">
            {aisle}
          </span>
        ))}
      </div>
    );
    const bar = (children: React.ReactNode) => (
      <div className="flex items-center gap-3 border-b border-border bg-shop-header px-4 py-3 text-shop-header-foreground">{children}</div>
    );

    if (layout === "masthead") {
      // The name on its own line; under it search, five departments, the marks.
      return (
        <div>
          <div className="border-b border-border bg-shop-header px-4 pb-3 pt-5 text-center text-shop-header-foreground">
            {logo}
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <span className="flex min-w-0">{search === "box" ? <span className="h-6 w-full max-w-[7rem] rounded-xs bg-current/12" /> : searchMark}</span>
              {nav(true, 5)}
              <span className="flex justify-end">
                {Array.from({ length: marks }, (_, i) => (
                  <span key={i} className="ml-2.5 size-4 rounded-xs bg-current/25" />
                ))}
              </span>
            </div>
          </div>
        </div>
      );
    }
    if (layout === "drawer") {
      return (
        <div className="border-b border-current/10">
          {bar(
            <>
              <span className="flex size-4 shrink-0 flex-col justify-center gap-[3px]" aria-hidden>
                <span className="block h-px bg-current/60" />
                <span className="block h-px bg-current/60" />
                <span className="block h-px bg-current/60" />
              </span>
              {logo}
              {search === "box" ? box : <span className="flex-1" />}
              {icons}
            </>,
          )}
        </div>
      );
    }
    // bar: the shop's name, search, the marks, and every department underneath.
    return (
      <div>
        {bar(
          <>
            {logo}
            {search === "box" ? box : <span className="flex-1" />}
            {icons}
          </>,
        )}
        <div className="border-b border-current/10">{nav(false)}</div>
      </div>
    );
  };

  if (slotKey === "header") return headerDrawing({ layout: variant });

  /*
    The footer is WIRED (2026-09-24): its choices are the footer section's
    settings, so they are read from `live` -- the section in the shop's document
    -- and only fall back to this editor's held choices where there is no
    section to read, as in the checkout's small drawing of it. One function
    draws every part, so the composed footer and each footer place's own band
    can never draw a part two ways; `force` is the value the open place shows.
  */
  const footerParts = (force: Record<string, string> = {}) => {
    const held = live?.settings ?? {};
    const chosen = (key: string, legacy: string, fallback: string) => {
      const value = held[key];
      if (typeof value === "string" && value) return value;
      return settings?.[legacy] ?? fallback;
    };
    const set = {
      contact: force.contact ?? chosen("contact", "contact", "full"),
      social: force.social ?? chosen("social", "social", "names"),
      payments:
        force.payments ??
        (typeof held.payments === "boolean" ? (held.payments ? "on" : "off") : (settings?.payments ?? "off")),
      bottom: force.bottom ?? chosen("bottom", "bottom", "copyright"),
    };
    const layout = force.layout ?? chosen("footer_layout", "layout", "columns");
    const me = shop ?? {
      name: "",
      address: "",
      phone: "",
      email: "",
      social: [],
      wishlist: false,
      orderLookup: false,
    };
    const name = me.name || t("footerShopName");
    const year = new Date().getFullYear();

    const heading = (text: string) => (
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">{text}</p>
    );
    const links = (items: string[]) =>
      items.map((link) => (
        <p key={link} className="mb-1.5 text-[11px] leading-relaxed">
          {link}
        </p>
      ));

    // The shop's own three columns, as `views/catalog._footer_columns` builds them.
    const columns = [
      {
        head: t("footerInformation"),
        items: [t("footerBlog"), t("footerPrivacy"), t("footerReturns"), t("footerCancellation")],
      },
      {
        head: t("footerService"),
        items: [
          t("footerAccount"),
          ...(me.orderLookup ? [t("footerTrack")] : []),
          ...(me.wishlist ? [t("footerWishlistLink")] : []),
          t("footerContactUs"),
        ],
      },
      { head: t("footerCompany"), items: [t("footerAbout")] },
    ];

    const contactLines =
      set.contact === "off"
        ? []
        : set.contact === "email"
          ? [me.email].filter(Boolean)
          : [me.address, me.phone, me.email].filter(Boolean);
    const contactNote =
      set.contact !== "off" && contactLines.length === 0 ? (
        <p className="text-[10.5px] italic text-current/45">{t("footerNoContact")}</p>
      ) : null;
    const shopBlock = (
      <div>
        {heading(name)}
        {contactLines.map((line) => (
          <p key={line} className="mb-1.5 text-[11px] leading-relaxed">
            {line}
          </p>
        ))}
        {contactNote}
      </div>
    );

    const socialWords: Record<string, string> = {
      facebook: t("socialFacebook"),
      instagram: t("socialInstagram"),
      whatsapp: t("socialWhatsapp"),
      tiktok: t("socialTiktok"),
    };
    const centred = layout === "centred" || layout === "minimal";
    const social =
      set.social === "off" ? null : me.social.length === 0 ? (
        <p className="mt-5 text-[10.5px] italic text-current/45">{t("footerNoSocial")}</p>
      ) : set.social === "marks" ? (
        <div className={cn("mt-5 flex gap-2.5", centred && "justify-center")}>
          {me.social.map((key) => (
            <span key={key} className="grid size-8 place-items-center rounded-full bg-current/12 text-foreground">
              <SocialLinkGlyph platform={key} />
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-[11px]">{me.social.map((key) => socialWords[key]).join(" · ")}</p>
      );

    // What the shop takes: cash always, bKash and Nagad where a product is paid
    // for up front (the tile says so). No card -- there is no card gateway.
    const payments =
      set.payments === "off" ? null : (
        <div className="mt-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-current/45">{t("paymentsHeading")}</p>
          <div className={cn("flex flex-wrap gap-2", centred && "justify-center")}>
            {[t("cashOnDelivery"), "bKash", "Nagad"].map((method) => (
              <span key={method} className="rounded-xs border border-current/15 px-2.5 py-1 text-[10px] text-current/70">
                {method}
              </span>
            ))}
          </div>
        </div>
      );

    const policies = [t("footerPrivacy"), t("footerReturns"), t("footerCancellation")].join(" · ");
    const bottom =
      set.bottom === "policies" ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-current/12 pt-4 text-[10px] text-current/45">
          <span>
            © {year} {name} · powered by Paperbase
          </span>
          <span>{policies}</span>
        </div>
      ) : (
        <p className="mt-5 border-t border-current/12 pt-4 text-[10px] text-current/45">
          © {year} {name} — {t("footerRights")} · powered by Paperbase
        </p>
      );

    const band = (children: React.ReactNode) => (
      <div className={cn("border-t border-border bg-muted px-5 py-5 text-current/65", centred && "text-center")}>
        {children}
      </div>
    );
    return { layout, set, name, columns, contactLines, contactNote, shopBlock, heading, links, social, payments, bottom, band, centred };
  };

  if (slotKey === "footer") {
    const { layout, name, columns, contactLines, contactNote, shopBlock, heading, links, social, payments, bottom, centred } =
      footerParts(variant ? { layout: variant } : {});
    const shell = (children: React.ReactNode) => (
      <div className={cn("border-t border-border bg-muted px-5 py-6 text-current/65", centred && "text-center")}>
        {children}
        {social}
        {payments}
        {bottom}
      </div>
    );

    if (layout === "minimal") {
      return shell(
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">{name}</p>
          <p className="mt-2.5 text-[11px]">
            {[t("footerAbout"), t("footerContactUs"), t("footerReturns"), t("footerPrivacy")].join(" · ")}
          </p>
        </>,
      );
    }
    if (layout === "centred") {
      return shell(
        <>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground">{name}</p>
          {contactLines.length ? <p className="mt-2.5 text-[11px]">{contactLines.join(" · ")}</p> : contactNote}
          <p className="mt-3 text-[11px]">{columns.flatMap((column) => column.items).join(" · ")}</p>
        </>,
      );
    }
    if (layout === "split") {
      return shell(
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          {shopBlock}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {columns.map((column) => (
              <div key={column.head}>
                {heading(column.head)}
                {links(column.items)}
              </div>
            ))}
          </div>
        </div>,
      );
    }
    return shell(
      <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
        {shopBlock}
        {columns.map((column) => (
          <div key={column.head}>
            {heading(column.head)}
            {links(column.items)}
          </div>
        ))}
      </div>,
    );
  }

  switch (`${page}:${slotKey}`) {
    /**
     * The hero, drawn as a hero.
     *
     * It was a grey rectangle with a caption naming itself, which is the one
     * band on the page a merchant cannot picture their own shop from. It now
     * holds what a hero holds -- a line that sells something, a line under it,
     * and the button -- so the choice between a slider, a still and a video is
     * made against three versions of the same real thing.
     */
    case "home:hero": {
      const slider = variant === "slider" || variant === undefined;
      // The merchant's own pictures, once this place is wired. Their first one
      // is what a shopper opens the shop on, so it is what belongs here -- an
      // example hero in its place is the editor telling a small lie about the
      // most-looked-at thing on the page.
      const pictures = (live?.blocks ?? [])
        .map((block) => block.settings?.image)
        .filter((key): key is string => typeof key === "string" && key !== "");
      if (slider && live) {
        return pictures.length ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-current/8">
            {/* eslint-disable-next-line @next/next/no-img-element -- a merchant
                upload on a bucket the dashboard does not configure a loader for */}
            <img
              src={pictureUrl?.(pictures[0]) || pictures[0]}
              alt=""
              className="h-full w-full object-cover"
            />
            {pictures.length > 1 ? (
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {pictures.map((key, index) => (
                  <span
                    key={key + index}
                    className={cn(
                      "size-1.5 rounded-full",
                      index === 0 ? "bg-white" : "bg-white/50",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid aspect-[21/9] w-full place-items-center bg-current/8 text-center">
            <span className="max-w-[26ch] text-[11.5px] leading-relaxed text-current/55">
              {t("heroEmpty")}
            </span>
          </div>
        );
      }
      return (
        <div className="relative flex min-h-[210px] flex-col justify-center gap-2.5 bg-current/8 px-7 pb-9 pt-7">
          {variant === "video" ? (
            <span
              className="absolute right-6 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-current/25 text-[13px]"
              aria-hidden
            >
              ▶
            </span>
          ) : null}
          <p className="text-[10px] uppercase tracking-[0.14em] text-current/45">{t("heroEyebrowExample")}</p>
          <p className="max-w-[22ch] text-[22px] font-semibold leading-[1.15]">{t("heroHeadingExample")}</p>
          <p className="max-w-[34ch] text-[11.5px] leading-relaxed text-current/55">{t("heroBodyExample")}</p>
          <span className="mt-1 grid h-9 w-fit place-items-center rounded-full bg-shop-brand px-6 text-[11.5px] font-semibold text-shop-brand-foreground">
            {t("heroButtonExample")}
          </span>
          {slider ? (
            <div className="absolute bottom-4 left-7 flex gap-1.5">
              <span className="h-1.5 w-5 rounded-full bg-current/50" />
              <span className="size-1.5 rounded-full bg-current/20" />
              <span className="size-1.5 rounded-full bg-current/20" />
            </div>
          ) : null}
        </div>
      );
    }

    case "home:categories": {
      // The shop's OWN departments once this place is wired, and example names
      // only until the list arrives. A merchant recognising their own
      // departments is how they know this band is the one they mean -- and the
      // heading is theirs too, drawn only when they have written one.
      const EXAMPLES = ["Audio", "Men", "Women", "Wearables", "Kids", "Home"];
      const names = departments?.length ? departments.map((one) => one.label) : EXAMPLES;
      const heading = typeof live?.settings?.heading === "string" ? live.settings.heading.trim() : "";

      return variant === "strip" ? (
        <div className="px-4 py-4">
          {heading ? <SectionHead band title={heading} /> : null}
          <div className="flex gap-2 overflow-hidden">
            {names.map((name) => (
              <span
                key={name}
                className="shrink-0 rounded-full border border-current/15 px-3 py-1.5 text-[11px]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-4">
          {heading ? <SectionHead band title={heading} /> : null}
          <div className="grid grid-cols-4 gap-3">
            {names.slice(0, 4).map((name) => (
              <div key={name} className="min-w-0">
                <div className="aspect-[4/3] rounded-xs bg-current/8" />
                <p className="mt-1.5 truncate text-center text-[11px] text-current/60">{name}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "home:trust": {
      // The merchant's OWN four once they have ticked them, and an example
      // until they do. A merchant who has just picked "Cash on delivery"
      // should see it here, not a stranger's promise -- that is how they know
      // the ticking worked.
      const picked = (live?.blocks ?? [])
        .map((block) => block.settings?.promise)
        .filter((name): name is string => typeof name === "string" && name !== "");
      const own = picked.map((name) => ({
        name,
        words: promiseWords?.(name) || name,
        Mark: PROMISE_MARKS[name] ?? Sparkles,
      }));
      const shown = own.length
        ? own
        : [
            { name: "delivery", words: t("trustDelivery"), Mark: Truck },
            { name: "returns", words: t("trustReturns"), Mark: RotateCcw },
            { name: "payment", words: t("trustPayment"), Mark: ShieldCheck },
            { name: "support", words: t("trustSupport"), Mark: Headphones },
          ];

      return variant === "line" ? (
        <p className="border-y border-current/10 px-4 py-3 text-center text-[11px] uppercase tracking-[0.06em] text-current/55">
          {own.length ? own.map((one) => one.words).join(" · ") : t("trustExample")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 border-y border-current/10 px-4 py-4 sm:grid-cols-4">
          {shown.map(({ name, words, Mark }) => (
            <div key={name} className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-current/8">
                <Mark className="size-3.5 text-current/55" aria-hidden />
              </span>
              <span className="min-w-0 truncate text-[11px] text-current/65">{words}</span>
            </div>
          ))}
        </div>
      );
    }

    case "home:featured":
      return (
        <div className="px-4 py-4">
          <SectionHead band title={liveHeading} link={t("browseAll")} />
          <Cards items={variant === "grid" ? [...FEATURED, ...BESTSELLERS] : FEATURED} />
        </div>
      );

    case "home:bands": {
      // The merchant's OWN three departments once they have picked, and their
      // first two otherwise -- which is what the shop draws when nothing is
      // picked. Example names only for a shop with no departments at all.
      // A plain object, not a Map: `Map` is one of this file's lucide icons.
      const byId: Record<string, string> = {};
      for (const one of departments ?? []) byId[one.value] = one.label;
      const picked = (live?.blocks ?? [])
        .map((block) => block.settings?.category)
        .filter((id): id is string => typeof id === "string" && id !== "")
        .map((id) => byId[id])
        .filter((name): name is string => Boolean(name));
      const fallback = (departments ?? []).map((one) => one.label).slice(0, 2);
      const names = (picked.length ? picked : fallback).slice(0, 3);
      const shown = names.length ? names : ["Button-Downs", "Outerwear"];
      const rows = [FEATURED, ARRIVALS, BESTSELLERS];

      return (
        <div className="px-4 py-4">
          {shown.map((name, index) => (
            <div key={name} className={index ? "mt-5" : undefined}>
              <SectionHead band title={name} link={t("browseAll")} />
              <Cards items={rows[index % rows.length]} />
            </div>
          ))}
          {/* The one button under all three, which the shop draws too. */}
          <p className="mt-4 text-center text-[11px] text-current/55">{t("bandsBrowseAll")}</p>
        </div>
      );
    }

    case "home:promo": {
      // The merchant's OWN promotion once they have written one, and an
      // example until they do. A shop with a sale on should see its own sale
      // here -- that is how they know the pop-up reached the page.
      const say = (key: string, fallback: string) => {
        const written = live?.settings?.[key];
        return typeof written === "string" && written.trim() ? written.trim() : fallback;
      };
      const eyebrow = typeof live?.settings?.eyebrow === "string" ? live.settings.eyebrow.trim() : "";
      const heading = say("heading", t("promoTextExample"));
      const body = typeof live?.settings?.body === "string" ? live.settings.body.trim() : "";
      const button = typeof live?.settings?.button_label === "string" ? live.settings.button_label.trim() : "";
      const ends = typeof live?.settings?.ends_at === "string" ? live.settings.ends_at.trim() : "";
      const counting = Boolean(live?.settings?.show_countdown) && Boolean(ends);
      const picture = typeof live?.settings?.image === "string" ? live.settings.image : "";
      // The shop falls back to the plain band when a shape that needs a
      // picture has none, so the drawing has to fall back with it.
      const shape = picture ? variant : "strip";

      const words = (
        <>
          {eyebrow ? (
            <p className="text-[10px] uppercase tracking-[0.1em] opacity-70">{eyebrow}</p>
          ) : null}
          <p className="text-[13.5px] font-semibold leading-tight">{heading}</p>
          {body ? <p className="mt-1 text-[11.5px] leading-relaxed opacity-70">{body}</p> : null}
          {counting ? (
            <p className="mt-1.5 text-[10.5px] tabular-nums opacity-70">{t("promoCountdownExample")}</p>
          ) : null}
          {button ? (
            <span className="mt-2.5 inline-block rounded-full bg-current/15 px-4 py-1.5 text-[10.5px] font-semibold">
              {button}
            </span>
          ) : null}
        </>
      );

      if (shape === "behind") {
        return (
          <div className="relative grid min-h-28 place-items-center overflow-hidden bg-current/70 px-4 py-6 text-center text-background">
            {/* The picture, and the scrim the shop puts over it. */}
            {pictureUrl?.(picture) ? (
              // eslint-disable-next-line @next/next/no-img-element -- a merchant
              // upload on a bucket the dashboard configures no loader for
              <img
                src={pictureUrl(picture)}
                alt=""
                className="absolute inset-0 size-full object-cover opacity-45"
              />
            ) : null}
            <div className="relative">{words}</div>
          </div>
        );
      }

      if (shape === "beside") {
        return (
          <div className="grid grid-cols-2 items-stretch bg-current/8">
            <div className="aspect-[4/3] bg-current/10">
              {pictureUrl?.(picture) ? (
                // eslint-disable-next-line @next/next/no-img-element -- as above
                <img src={pictureUrl(picture)} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="flex flex-col justify-center px-4 py-4">{words}</div>
          </div>
        );
      }

      return <div className="bg-current/8 px-4 py-5 text-center">{words}</div>;
    }

    case "home:bestsellers":
      return (
        <div className="px-4 py-4">
          <SectionHead band title={liveHeading || t("bestsellersHeading")} link={t("browseAll")} />
          <Cards items={BESTSELLERS} />
        </div>
      );

    case "home:arrivals":
      return (
        <div className="px-4 py-4">
          <SectionHead band title={liveHeading || t("arrivalsHeading")} link={t("browseAll")} />
          <Cards items={ARRIVALS} />
        </div>
      );

    /*
      The rest of the home page, 2026-09-24: the shop's own brands, reviews,
      posts and questions, and a line saying so where there is nothing -- the
      shop draws nothing then, and a band of examples would say otherwise.
    */
    case "home:brands": {
      const shown = (brands ?? []).slice(0, 6);
      return (
        <div className="px-4 py-5">
          <SectionHead band title={liveHeading || t("brandsHeading")} link={t("allBrands")} />
          {shown.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {shown.map((brand) => (
                <div
                  key={brand.name}
                  className="flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-xs border border-current/10 px-2 py-2 text-center"
                >
                  {brand.logo ? <span className="h-5 w-10 rounded-xs bg-current/10" aria-hidden /> : null}
                  <span className="text-[10px] uppercase tracking-[0.06em] text-current/70">{brand.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] italic text-current/45">{t("brandsNone")}</p>
          )}
        </div>
      );
    }

    case "home:reviews": {
      const shown = (reviews ?? []).slice(0, 3);
      const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);
      const who = (review: ReviewPreview) => (review.byShop ? `${review.name} · ${t("reviewsByShop")}` : review.name);
      if (!shown.length) {
        return (
          <div className="px-4 py-5">
            <SectionHead band title={liveHeading || t("reviewsHeading")} />
            <p className="text-[11px] italic text-current/45">{t("reviewsNone")}</p>
          </div>
        );
      }
      return variant === "quote" ? (
        <div className="px-6 py-6 text-center">
          <p className="text-[11px] text-current/70">{stars(shown[0].rating)}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-current/70">“{shown[0].body}”</p>
          <p className="mt-2.5 text-[11px] uppercase tracking-[0.08em] text-current/45">
            {who(shown[0])} · {shown[0].product}
          </p>
        </div>
      ) : (
        <div className="px-4 py-4">
          <SectionHead band title={liveHeading || t("reviewsHeading")} />
          <div className="grid gap-3 sm:grid-cols-3">
            {shown.map((review, index) => (
              <div key={index} className="rounded-md border border-current/12 p-3.5">
                <p className="text-[11px] text-current/70">{stars(review.rating)}</p>
                <p className="mt-2 line-clamp-5 text-[11.5px] leading-relaxed text-current/65">{review.body}</p>
                <p className="mt-3 text-[11px] font-medium">{who(review)}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-current/45">{review.product}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "home:posts": {
      const newest = (blog?.posts ?? []).slice(0, 3);
      return (
        <div className="px-4 py-4">
          <SectionHead band title={liveHeading || t("postsHeading")} link={t("articleAllPosts")} />
          {newest.length ? (
            <PostCards posts={newest} line={(post) => post.date || null} cards="full" columns={3} />
          ) : (
            <p className="text-[11px] italic text-current/45">{t("postsNone")}</p>
          )}
        </div>
      );
    }

    case "home:signup": {
      // The shop's own words until the merchant writes theirs, and no button
      // at all without a number to open a chat with -- as on the shop.
      const words = (key: string, fallback: string) => {
        const held = live?.settings?.[key];
        return typeof held === "string" && held.trim() ? held.trim() : fallback;
      };
      const number = shop ? shop.social.includes("whatsapp") : true;
      return (
        <div className="bg-[color:var(--color-accent)]/15 px-6 py-6 text-center">
          <p className="text-[15px] font-semibold">{words("heading", t("signupWhatsappHeading"))}</p>
          <p className="mx-auto mt-1.5 max-w-md text-[11.5px] leading-relaxed text-current/65">
            {words("body", t("signupWhatsappBody"))}
          </p>
          {number ? (
            <span className="mt-3 inline-grid h-9 place-items-center rounded-xs bg-shop-brand px-4 text-[11px] text-shop-brand-foreground">
              {words("button_label", t("signupWhatsappButton"))}
            </span>
          ) : (
            <p className="mt-3 text-[11px] italic text-current/50">{t("signupNoNumber")}</p>
          )}
        </div>
      );
    }

    case "home:faq": {
      // The merchant's own questions, as the pop-up writes them. The shop
      // draws a heading only when one is written, so the drawing does too.
      const asked = (live?.blocks ?? [])
        .filter((block) => block.type === "question")
        .map((block) => (typeof block.settings?.question === "string" ? block.settings.question.trim() : ""))
        .filter(Boolean);
      return (
        <div className="px-4 py-4">
          {liveHeading ? <SectionHead band title={liveHeading} /> : null}
          {asked.length ? (
            <div className="divide-y divide-current/10 border-y border-current/10">
              {asked.map((question, index) => (
                <p key={index} className="flex items-center justify-between gap-3 py-3 text-[12px] text-current/70">
                  {question}
                  <span aria-hidden className="text-current/40">
                    +
                  </span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[11px] italic text-current/45">{t("faqNone")}</p>
          )}
        </div>
      );
    }

    /**
     * The buying column, and the pictures beside it.
     *
     * The same shirt the cart and the checkout carry, drawn in the same
     * language: one shop, one order, followed through three pages. The buttons
     * say what they do -- they were two blank grey bars before, which is the
     * one thing a merchant cannot judge a buying column by.
     */
    case "product:buy": {
      const pictures =
        variant === "column" ? (
          <div className="space-y-2">
            <div className="aspect-[4/5] rounded-md bg-current/8" />
            <div className="aspect-[4/5] rounded-md bg-current/8" />
          </div>
        ) : variant === "single" ? (
          <div className="aspect-square rounded-md bg-current/8" />
        ) : (
          <div>
            <div className="aspect-square rounded-md bg-current/8" />
            <div className="mt-2 flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <span
                  key={i}
                  className={`size-12 rounded-sm bg-current/8 ${i === 0 ? "ring-1 ring-current/30" : ""}`}
                />
              ))}
            </div>
          </div>
        );
      const chip = (label: string, chosen: boolean) => (
        <span
          key={label}
          className={`grid h-8 min-w-8 place-items-center rounded-sm px-2.5 text-[11px] ${
            chosen ? "bg-foreground font-semibold text-background" : "border border-current/15 text-current/65"
          }`}
        >
          {label}
        </span>
      );
      return (
        <div className="grid gap-6 px-4 py-4 sm:grid-cols-2">
          {pictures}
          <div className="min-w-0">
            <h4 className="m-0 text-[19px] font-semibold leading-snug">Gradient Graphic T-shirt</h4>
            <p className="mt-1.5 flex items-center gap-2 text-[11px] text-current/55">
              <span className="text-current/70">★★★★★</span>
              <span className="tabular-nums">4.7</span>
              <span className="text-current/35">·</span>
              <span>{t("productReviewsCount")}</span>
            </p>

            <p className="mt-3 flex flex-wrap items-baseline gap-2.5">
              <span className="text-[24px] font-semibold tabular-nums">৳1,450</span>
              <span className="text-[14px] tabular-nums text-current/40 line-through">৳2,400</span>
              <span className="rounded-full bg-[#d64545]/12 px-2 py-0.5 text-[10px] font-semibold text-[#d64545]">
                −40%
              </span>
            </p>

            <p className="mt-4 mb-2 text-[11px] text-current/45">
              {t("colour")}: <span className="text-current/75">White</span>
            </p>
            <div className="flex gap-2">
              <span className="size-7 rounded-full bg-current/70 ring-2 ring-current/20 ring-offset-2" />
              <span className="size-7 rounded-full bg-current/25" />
              <span className="size-7 rounded-full bg-current/12" />
            </div>

            <p className="mt-4 mb-2 text-[11px] text-current/45">
              {t("cartLineSize")}: <span className="text-current/75">Large</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {["S", "M", "L", "XL"].map((size) => chip(size, size === "L"))}
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <span className="inline-flex shrink-0 items-center rounded-full border border-current/15 text-[12px] leading-none">
                <span className="px-3 py-2.5 text-current/45">−</span>
                <span className="px-2 py-2.5 tabular-nums">1</span>
                <span className="px-3 py-2.5 text-current/45">+</span>
              </span>
              <span className="grid h-11 flex-1 place-items-center rounded-full bg-shop-brand text-[12px] font-semibold text-shop-brand-foreground">
                {t("addToCart")}
              </span>
            </div>
            <span className="mt-2.5 grid h-10 place-items-center rounded-full border border-current/20 text-[11.5px] font-medium">
              ♡&nbsp;&nbsp;{t("productSave")}
            </span>

            <p className="mt-3.5 text-[11px] text-current/50">
              <span className="text-[#2f8f4e]">●</span> {t("productInStock")} · {t("productDeliveryNote")}
            </p>
          </div>
        </div>
      );
    }

    case "product:trust": {
      // The same four the home page shows: picked once, drawn in two places.
      const words = (live?.blocks ?? [])
        .map((block) => block.settings?.promise)
        .filter((name): name is string => typeof name === "string" && name !== "")
        .map((name) => promiseWords?.(name) || name);
      return (
        <p className="border-y border-current/10 px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.08em] text-current/50">
          {words.length ? words.join(" · ") : t("trustExample")}
        </p>
      );
    }

    /*
      The trust line, and the merchant's own the moment they have any: their
      words if they typed some, otherwise the promises they picked for the home
      page, which is what the shop draws. An example only for a shop that has
      neither.
    */
    case "cart:trust":
    case "checkout:trust": {
      // `live` here is the CART's own section, not the promises band -- the
      // promises are picked on the home page and this canvas cannot see them
      // from here. So: the merchant's typed line when there is one, and an
      // example of the shape otherwise.
      const written =
        typeof live?.settings?.trust_text === "string" ? live.settings.trust_text.trim() : "";
      return (
        <p className="border-t border-current/10 px-4 py-3 text-center text-[11px] uppercase tracking-[0.06em] text-current/55">
          {written || (page === "product" ? t("trustExample") : t("trustLineExample"))}
        </p>
      );
    }

    /*
      The category page draws ONE category to stand for all of them -- it is a
      template, not a page -- and that one is the merchant's own first
      department wherever the shop has any. "Bags" belongs to no shop on this
      platform, and a merchant reading a page about somebody else's aisle
      cannot tell whether what they are looking at is their shop or a brochure.
    */
    case "category:breadcrumb":
      return (
        <p className="px-4 py-3 text-[11px] text-current/45">
          {t("breadcrumbHomeExample")} · <span className="text-current/70">{exampleCategory}</span>
        </p>
      );

    case "category:heading":
      if (variant === "banner") {
        return (
          <div className="relative grid h-[130px] place-items-center bg-current/10 px-4 text-center">
            <span>
              <span className="block text-[22px] font-medium tracking-tight">{exampleCategory}</span>
              <span className="mt-1 block text-[11px] text-current/55">{t("catDescriptionExample")}</span>
            </span>
          </div>
        );
      }
      return (
        <div className="px-4 py-5">
          {variant === "eyebrow" ? (
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.1em] text-current/45">{t("catEyebrowExample")}</p>
          ) : null}
          <h4 className="m-0 text-[22px] font-medium tracking-tight">{exampleCategory}</h4>
          <p className="mt-1.5 max-w-[46ch] text-[11.5px] leading-relaxed text-current/55">
            {t("catDescriptionExample")}
          </p>
        </div>
      );

    case "category:count":
      return <p className="px-4 pb-1 text-[11px] text-current/45">{t("catCountExample", { count: 24 })}</p>;

    /*
      Five, the same five the shop draws. The first is the merchant's own shelf
      order -- what the page is in until somebody sorts it -- so it is the one
      filled in: a control showing "Newest" over a page in no such order is a
      control lying about the page under it.
    */
    case "category:sort": {
      const orders = [
        t("sortFeatured"),
        t("sortNewest"),
        t("sortPriceLow"),
        t("sortPriceHigh"),
        t("sortPopular"),
      ];
      return variant === "tabs" ? (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {orders.map((name, i) => (
            <span
              key={name}
              // Never `bg-current` on something that also sets `color`: the fill
              // resolves to the label's colour and the chip disappears.
              className={
                i === 0
                  ? "rounded-xs bg-foreground px-2.5 py-1 text-[11px] text-background"
                  : "rounded-xs border border-current/15 px-2.5 py-1 text-[11px] text-current/60"
              }
            >
              {name}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <span className="text-[11px] text-current/45">{t("sortBy")}</span>
          <span className="inline-flex items-center gap-2 rounded-xs border border-current/15 px-2.5 py-1.5 text-[11px]">
            {orders[0]}
            <span className="text-current/40" aria-hidden>
              ▾
            </span>
          </span>
        </div>
      );
    }

    /**
     * Filters, as a row or as a rail.
     *
     * A rail costs the grid a quarter of its width on a computer and becomes a
     * drawer on a phone, which is why it is a separate answer rather than the
     * same one bigger: a shop with three brands wants chips, a shop with sizes
     * and colours and a price range wants the rail.
     */
    case "category:filters": {
      const groups = [t("filterPrice"), t("filterBrand"), t("filterSize"), t("filterColour")];
      if (variant === "rail") {
        return (
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <div className="grid content-start gap-3">
              {groups.map((name) => (
                <span key={name}>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.06em] text-current/50">
                    {name}
                  </span>
                  <span className="grid gap-1">
                    <Line w="80%" h={5} />
                    <Line w="60%" h={5} />
                  </span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="block aspect-square rounded-xs bg-current/8" />
              ))}
            </div>
          </div>
        );
      }
      /*
        One button, and what pressing it does (owner, 2026-09-23): the panel
        comes in from the left OVER the page. Drawn rather than described,
        because the whole point of this shape is that the grid underneath does
        not move -- which a row of pills did not say at all.
      */
      return (
        <div className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-xs border border-current/25 px-3 py-1 text-[11px]">
            {t("catFilters")}
          </span>
          <div className="relative mt-2.5 overflow-hidden rounded-xs border border-current/10">
            <div className="grid grid-cols-4 gap-2 p-2">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="block aspect-square rounded-xs bg-current/8" />
              ))}
            </div>
            <span className="absolute inset-0 bg-black/45" />
            <span className="absolute inset-y-0 left-0 grid w-[46%] content-start gap-2 bg-background p-2">
              <span className="flex items-center justify-between">
                <span className="text-[10px] font-medium">{t("catFilters")}</span>
                <span className="text-[11px] text-current/45" aria-hidden>
                  ×
                </span>
              </span>
              {groups.slice(0, 3).map((name) => (
                <span key={name} className="grid gap-1">
                  <span className="text-[9px] uppercase tracking-[0.06em] text-current/45">{name}</span>
                  <Line w="80%" h={5} />
                </span>
              ))}
            </span>
          </div>
        </div>
      );
    }

    /*
      Words under the grid, and the merchant's own the moment they have typed
      any -- a wired place drawing a stock example is a place that still looks
      like a brochure. The example names their own department too: this one said
      "About our bags" over a shop that sells cameras until the owner pointed at
      it on 2026-09-23. Each half falls back on its own: somebody who has written
      a heading and no paragraph yet sees their heading, not their heading and a
      stranger's words.
    */
    case "category:text": {
      const written = (key: string) =>
        typeof live?.settings?.[key] === "string" ? (live.settings[key] as string).trim() : "";
      const heading = written("heading");
      const body = written("body");
      const left = live?.settings?.align === "left";
      return (
        <div className={cn("px-4 py-5", left ? "text-left" : "text-center")}>
          <h4 className="m-0 mb-2 text-[14px] font-semibold">
            {heading || t("catTextHeadingExample", { name: exampleCategory })}
          </h4>
          <p
            className={cn(
              "max-w-[52ch] text-[11.5px] leading-relaxed text-current/55",
              left ? "" : "mx-auto",
            )}
          >
            {body || t("catTextBodyExample", { name: exampleCategory })}
          </p>
        </div>
      );
    }

    case "category:empty":
      return (
        <div className="border-t border-dashed border-current/15 px-4 py-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.06em] text-current/40">{t("catEmptyWhen")}</p>
          {variant === "invite" ? (
            <div className="grid place-items-center gap-3 py-4 text-center">
              <span>
                <span className="block text-[14px] font-medium">
                  {t("catEmptyHeadingExample", { name: exampleCategory })}
                </span>
                <span className="mt-1 block text-[11px] text-current/50">{t("catEmptyBodyExample")}</span>
              </span>
              <span className="grid h-9 place-items-center rounded-xs bg-foreground px-5 text-[11px] font-semibold text-background">
                {t("catEmptyButtonExample")}
              </span>
            </div>
          ) : (
            <p className="py-4 text-[12px] text-current/55">
              {t("catEmptyTextExample", { name: exampleCategory })}
            </p>
          )}
        </div>
      );

    case "search:heading":
      return (
        <div className="px-4 py-5">
          <h4 className="m-0 text-[19px] font-medium tracking-tight">
            {t("searchResultsFor")} <span className="italic">&ldquo;{exampleTerm}&rdquo;</span>
            {variant === "plain" ? null : (
              <span className="ml-2 text-[13px] font-normal text-current/45">({t("catCountExample", { count: 7 })})</span>
            )}
          </h4>
        </div>
      );

    /* The shop's own departments: these are the categories it would match. */
    case "search:categories":
      return (
        <div className="px-4 py-4">
          <p className="mb-2.5 text-[11px] font-semibold">{t("searchCategoriesHeading")}</p>
          <div className="flex flex-wrap gap-2">
            {(departments?.length ? departments.map((one) => one.label) : [exampleCategory])
              .slice(0, 3)
              .map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-current/15 px-3 py-1 text-[11px] text-current/60"
                >
                  {name}
                </span>
              ))}
          </div>
        </div>
      );

    case "search:grid":
    case "category:grid": {
      const cols = variant === "two" ? 2 : variant === "three" ? 3 : 4;
      const items = [...FEATURED, ...BESTSELLERS].slice(0, cols * 2);
      return (
        <div className="px-4 py-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {items.map((item) => (
              <div key={item.name} className="min-w-0">
                <div className="rounded-xs bg-current/8" style={{ aspectRatio: "1" }} />
                <p className="mt-2 truncate text-[11px] text-current/60">{item.name}</p>
                <p className="text-[12px] font-semibold tabular-nums">{item.price}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "search:more":
    case "category:more":
      return variant === "pages" ? (
        <div className="flex items-center justify-center gap-1.5 px-4 py-4 text-[11px]">
          <span className="grid size-7 place-items-center rounded-xs bg-foreground text-background">1</span>
          {[2, 3].map((n) => (
            <span key={n} className="grid size-7 place-items-center rounded-xs border border-current/15 text-current/60">
              {n}
            </span>
          ))}
          <span className="px-1 text-current/40">›</span>
        </div>
      ) : (
        <div className="grid place-items-center px-4 py-4">
          <span className="rounded-xs border border-current/25 px-5 py-2 text-[11px] font-medium">{t("catMoreButtonExample")}</span>
        </div>
      );

    case "search:empty":
      return (
        <div className="border-t border-dashed border-current/15 px-4 py-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.06em] text-current/40">{t("searchEmptyWhen")}</p>
          {variant === "invite" ? (
            <div className="grid place-items-center gap-3 py-3 text-center">
              <span>
                <span className="block text-[14px] font-medium">
                  {t("searchEmptyHeadingExample", { term: exampleTerm })}
                </span>
                <span className="mt-1 block text-[11px] text-current/50">{t("searchEmptyBodyExample")}</span>
              </span>
              {/* The categories it would offer: this shop's own, not three invented ones. */}
              <span className="flex flex-wrap justify-center gap-2">
                {(departments?.length ? departments.map((one) => one.label) : [exampleCategory])
                  .slice(0, 3)
                  .map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-current/20 px-3 py-1 text-[11px]"
                    >
                      {name}
                    </span>
                  ))}
              </span>
            </div>
          ) : (
            <p className="py-3 text-[12px] text-current/55">
              {t("searchEmptyTextExample", { term: exampleTerm })}
            </p>
          )}
        </div>
      );

    case "search:prompt":
      return (
        <div className="border-t border-dashed border-current/15 px-4 py-5">
          <p className="mb-2.5 text-[10px] uppercase tracking-[0.06em] text-current/40">{t("searchPromptWhen")}</p>
          {variant === "trending" ? (
            <>
              <SectionHead title={t("searchTrendingHeading")} />
              <Cards items={BESTSELLERS} />
            </>
          ) : (
            <p className="py-2 text-[12px] text-current/55">{t("searchPromptExample")}</p>
          )}
        </div>
      );

    /* ---------------------------------------------------------- wishlist -- */

    case "wishlist:heading":
      return (
        <div className="px-4 py-5">
          <h4 className="m-0 text-[20px] font-medium tracking-tight">
            {t("wishTitleExample")}
            {variant === "plain" ? null : (
              <span className="ml-2 text-[13px] font-normal text-current/45">({t("catCountExample", { count: 4 })})</span>
            )}
          </h4>
        </div>
      );

    case "wishlist:items": {
      const buy = (settings?.action ?? "cart") === "cart";
      if (variant === "rows") {
        return (
          <div className="p-4">
            <div className="rounded-md border border-current/12">
              {BESTSELLERS.slice(0, 3).map((item, i) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-3.5 p-3.5 ${i ? "border-t border-current/10" : ""}`}
                >
                  <span className="size-16 shrink-0 rounded-sm bg-current/8" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{item.name}</span>
                    <span className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-[14px] font-semibold tabular-nums">{item.price}</span>
                      {item.was ? (
                        <span className="text-[10px] tabular-nums text-current/35 line-through">{item.was}</span>
                      ) : null}
                    </span>
                  </span>
                  {buy ? (
                    <span className="grid h-9 shrink-0 place-items-center rounded-full bg-shop-brand px-4 text-[11px] font-semibold text-shop-brand-foreground">
                      {t("addToCart")}
                    </span>
                  ) : null}
                  {/* The heart is how it got here, so the heart is how it leaves. */}
                  <Heart className="size-4 shrink-0 fill-current text-[#d64545]" aria-hidden />
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {BESTSELLERS.map((item) => (
              <div key={item.name} className="min-w-0">
                <span className="relative block aspect-square overflow-hidden rounded-md bg-current/8">
                  <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[color:var(--color-background)] shadow-sm">
                    <Heart className="size-3.5 fill-current text-[#d64545]" aria-hidden />
                  </span>
                  {item.off ? (
                    <span className="absolute left-2 top-2 rounded-full bg-[#d64545] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      −{item.off}%
                    </span>
                  ) : null}
                </span>
                <p className="mt-2 truncate text-[11.5px] font-medium">{item.name}</p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-[12.5px] font-semibold tabular-nums">{item.price}</span>
                  {item.was ? (
                    <span className="text-[10px] tabular-nums text-current/35 line-through">{item.was}</span>
                  ) : null}
                </p>
                {buy ? (
                  <span className="mt-2 grid h-9 place-items-center rounded-full bg-shop-brand text-[11px] font-semibold text-shop-brand-foreground">
                    {t("addToCart")}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }

    /**
     * A control, like the coupon's. The list above already draws the answer --
     * it reads this slot's value -- so a band redrawing one of its own cards
     * put the same thing in front of a merchant twice.
     */
    case "wishlist:action":
      return (
        <div className="flex items-baseline gap-2 px-4 pb-4 text-[11px]">
          <span className="shrink-0 uppercase tracking-[0.08em] text-current/40">{t("wishActionWhat")}</span>
          <span className="min-w-0 flex-1 truncate text-current/65">
            {variant === "look" ? t("wishActionLookExample") : t("addToCart")}
          </span>
        </div>
      );

    case "wishlist:empty":
      return (
        <div className="border-t border-dashed border-current/15 px-4 py-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.06em] text-current/40">{t("wishEmptyWhen")}</p>
          {variant === "invite" ? (
            <div className="grid place-items-center gap-3 py-3 text-center">
              <span>
                <span className="block text-[14px] font-medium">{t("wishEmptyHeadingExample")}</span>
                <span className="mt-1 block text-[11px] text-current/50">{t("wishEmptyBodyExample")}</span>
              </span>
              <span className="grid h-9 place-items-center rounded-xs bg-foreground px-5 text-[11px] font-semibold text-background">
                {t("cartEmptyButtonExample")}
              </span>
            </div>
          ) : (
            <p className="py-3 text-[12px] text-current/55">{t("wishEmptyTextExample")}</p>
          )}
        </div>
      );

    /* ----------------------------------------------------------- account -- */

    /**
     * The welcome card, drawn as the shop draws it (owner, 2026-09-25): the
     * shopper's DiceBear face, the greeting, how the shop reaches them, how
     * long they have been a member, what they have here, and their newest
     * order. Reviews and Saved are counted only where their page exists -- the
     * reviews place on this page, the wishlist switch in Settings -- as the
     * shop leaves them out too.
     */
    case "account:greeting": {
      const counts = [
        { n: "3", label: t("accountCountOrders") },
        ...(settings?.reviews === "off" ? [] : [{ n: "2", label: t("accountCountReviews") }]),
        ...(shop && !shop.wishlist ? [] : [{ n: "5", label: t("accountCountSaved") }]),
      ];
      return (
        <div className="px-4 py-5">
          <div className="flex flex-col items-center rounded-md border border-current/12 px-4 py-5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed DiceBear drawing, as the dashboard's own avatars */}
            <img src={getAvatarUrl(EXAMPLE_SHOPPER_SEED)} alt="" className="size-12 rounded-full" />
            <h4 className="m-0 mt-2.5 text-[20px] font-light uppercase">
              {variant === "name" ? t("accountGreetingExample") : t("accountTitleExample")}
            </h4>
            <p className="m-0 mt-1 text-[11px] text-current/55">{t("accountContactExample")}</p>
            <p className="m-0 mt-0.5 text-[10px] text-current/45">{t("accountMemberSinceExample")}</p>
            <div className="mt-3 flex w-full gap-1.5">
              {counts.map((count) => (
                <div key={count.label} className="flex-1 rounded-sm bg-current/8 py-2">
                  <p className="m-0 text-[14px] tabular-nums">{count.n}</p>
                  <p className="m-0 text-[10px] text-current/55">{count.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-md border border-current/12 p-3">
            <span className="size-9 shrink-0 rounded-sm bg-current/8" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[10px] text-current/45">{t("accountLatestOrder")}</p>
              <p className="m-0 mt-0.5 text-[12px] tabular-nums">#1042 &middot; ৳4,670</p>
              <p className="m-0 text-[10px] text-current/55">{t("orderOnTheWay")}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-current/40" aria-hidden />
          </div>
        </div>
      );
    }

    /**
     * What they have written, in every state -- including the ones only they
     * and the shop can see, which is the point: a review waiting for approval
     * that its own author cannot find reads as lost.
     *
     * Drawn as the shop draws it, down to the word for each state, because a
     * merchant deciding whether to keep this band is deciding whether their
     * customers can find a review they are still waiting on.
     */
    case "account:reviews": {
      if (variant === "off") {
        return (
          <p className="px-4 py-4 text-center text-[11px] text-current/45">{t("accountReviewsOffExample")}</p>
        );
      }
      const mine = [
        { product: t("accountReviewProduct"), state: t("accountReviewPublished"), tone: "text-current/45" },
        { product: t("accountReviewProductTwo"), state: t("accountReviewWaiting"), tone: "text-[#b4571f]" },
      ];
      return (
        <div className="px-4 py-4">
          <p className="mb-2.5 text-[12.5px] font-semibold">{t("accountReviewsHeading")}</p>
          <div className="rounded-md border border-current/12">
            {mine.map((one, i) => (
              <div key={one.product} className={`p-3 ${i ? "border-t border-current/10" : ""}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[12px] font-medium">{one.product}</span>
                  <span className={`shrink-0 text-[10px] ${one.tone}`}>{one.state}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] tracking-[0.1em] text-current/45" aria-hidden>
                    &#9733;&#9733;&#9733;&#9733;&#9733;
                  </span>
                  <span className="text-[10px] text-current/45">
                    {t("accountReviewEdit")} &middot; {t("accountReviewDelete")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "account:orders": {
      // Green for arrived, amber for moving. Status is the whole reason
      // somebody opens this page, so it is the one thing carrying colour.
      const orders = [
        { id: "#1042", date: "12 Sep 2026", state: t("orderDelivered"), total: "৳4,670", tone: "#2f8f4e" },
        { id: "#1038", date: "2 Sep 2026", state: t("orderOnTheWay"), total: "৳1,890", tone: "#b4571f" },
      ];
      if (variant === "cards") {
        return (
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-md border border-current/12 p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold tabular-nums">{order.id}</span>
                  <span className="text-[14px] font-semibold tabular-nums">{order.total}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-current/45">{order.date}</p>
                <span
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium"
                  style={{ backgroundColor: `${order.tone}1f`, color: order.tone }}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: order.tone }} aria-hidden />
                  {order.state}
                </span>
                <div className="mt-3 flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-10 rounded-sm bg-current/8" aria-hidden />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="px-4 py-4">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center gap-3 border-b border-current/10 py-3.5">
              <span className="w-14 shrink-0 text-[12.5px] font-semibold tabular-nums">{order.id}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-current/45">{order.date}</span>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium"
                style={{ backgroundColor: `${order.tone}1f`, color: order.tone }}
              >
                {order.state}
              </span>
              <span className="w-16 shrink-0 text-right text-[13px] font-semibold tabular-nums">{order.total}</span>
            </div>
          ))}
        </div>
      );
    }

    case "account:empty":
      return (
        <div className="border-t border-dashed border-current/15 px-4 py-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.06em] text-current/40">{t("accountEmptyWhen")}</p>
          {variant === "invite" ? (
            <div className="grid place-items-center gap-3 py-3 text-center">
              <span>
                <span className="block text-[14px] font-medium">{t("accountEmptyHeadingExample")}</span>
                <span className="mt-1 block text-[11px] text-current/50">{t("accountEmptyBodyExample")}</span>
              </span>
              <span className="grid h-9 place-items-center rounded-xs bg-foreground px-5 text-[11px] font-semibold text-background">
                {t("cartEmptyButtonExample")}
              </span>
            </div>
          ) : (
            <p className="py-3 text-[12px] text-current/55">{t("accountEmptyTextExample")}</p>
          )}
        </div>
      );

    /* -------------------------------------------------------------- blog -- */

    /* The merchant's own name and line, or the shop's own words until they write some. */
    case "blog:heading": {
      const written = (key: string) =>
        typeof live?.settings?.[key] === "string" ? (live.settings[key] as string).trim() : "";
      return (
        <div className="px-4 py-5">
          <h4 className="m-0 text-[20px] font-medium tracking-tight">{written("title") || t("blogTitleDefault")}</h4>
          <p className="mt-1.5 max-w-[46ch] text-[11.5px] leading-relaxed text-current/55">
            {written("intro") || t("blogIntroDefault")}
          </p>
        </div>
      );
    }

    /* No button: it narrows the posts as a reader types, so a button would do nothing. */
    case "blog:search":
      return (
        <div className="px-4 py-3">
          <span className="flex h-9 items-center gap-2 rounded-full border border-current/15 bg-current/[0.04] px-3.5 text-[11px] text-current/40">
            <Search className="size-3.5 shrink-0 text-current/30" aria-hidden />
            {t("blogSearchPlaceholder")}
          </span>
        </div>
      );

    /* This shop's own tags -- "All" alone for a shop that has none yet. */
    case "blog:tags":
      return (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {[t("blogTagAll"), ...(blog?.tags ?? []).slice(0, 6)].map((name, i) => (
            <span
              key={name}
              className={
                i === 0
                  ? "rounded-full bg-foreground px-3 py-1 text-[11px] text-background"
                  : "rounded-full border border-current/15 px-3 py-1 text-[11px] text-current/60"
              }
            >
              {name}
            </span>
          ))}
        </div>
      );

    /**
     * The featured posts: one given the width, or four in a row.
     *
     * The merchant's own marked posts; a shop that has marked none sees its
     * newest in their place, so the shape can still be judged.
     */
    case "blog:featured": {
      const line = postLine(blogChoice("meta", "date"));
      const marked = shopPosts.filter((post) => post.featured);
      const shown = marked.length ? marked : shopPosts;
      if (variant === "hero") {
        const lead = shown[0];
        const under = line(lead);
        return (
          <div className="px-4 py-4">
            <SectionHead title={t("blogFeaturedHeadingExample")} />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="aspect-[16/10] rounded-md bg-current/8" aria-hidden />
              <div className="flex flex-col justify-center gap-2">
                {lead.tag ? (
                  <p className="w-fit rounded-full bg-current/8 px-2.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-current/55">
                    {lead.tag}
                  </p>
                ) : null}
                <p className="text-[17px] font-semibold leading-snug">{lead.title}</p>
                {blogChoice("cards", "full") === "full" ? (
                  <p className="text-[11.5px] leading-relaxed text-current/55">{lead.excerpt}</p>
                ) : null}
                {under ? <p className="text-[10px] text-current/40">{under}</p> : null}
                <p className="mt-0.5 text-[11px] font-medium underline underline-offset-4">{t("blogReadOn")}</p>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("blogFeaturedHeadingExample")} />
          <PostCards posts={shown.slice(0, 4)} line={line} cards={blogChoice("cards", "full")} />
        </div>
      );
    }

    case "blog:latest": {
      const line = postLine(blogChoice("meta", "date"));
      if (variant === "rows") {
        return (
          <div className="px-4 py-4">
            <SectionHead title={t("blogLatestHeadingExample")} />
            <div className="grid gap-3">
              {shopPosts.slice(0, 3).map((post) => {
                const under = line(post);
                return (
                  <div key={post.title} className="flex items-center gap-3.5 border-b border-current/10 pb-3.5">
                    <span className="h-16 w-24 shrink-0 rounded-md bg-current/8" aria-hidden />
                    <span className="min-w-0 flex-1">
                      {post.tag ? (
                        <span className="block text-[9.5px] uppercase tracking-[0.08em] text-current/40">{post.tag}</span>
                      ) : null}
                      <span className="mt-0.5 block truncate text-[13px] font-semibold">{post.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-current/50">{post.excerpt}</span>
                    </span>
                    {under ? <span className="shrink-0 text-[10px] text-current/40">{under}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("blogLatestHeadingExample")} />
          <PostCards posts={shopPosts.slice(0, 4)} line={line} cards={blogChoice("cards", "full")} />
        </div>
      );
    }

    // The card shape and the line under it are read by the two shelves above,
    // so their own bands show the choice in the place it will really be made.
    case "blog:cards":
    case "blog:meta":
      return (
        <div className="px-4 py-4">
          <p className="mb-2.5 text-[10px] uppercase tracking-[0.08em] text-current/45">
            {slotKey === "cards" ? t("blogCardsWhat") : t("blogMetaWhat")}
          </p>
          <PostCards
            posts={shopPosts.slice(0, 2)}
            cards={slotKey === "cards" ? (variant ?? "full") : blogChoice("cards", "full")}
            line={postLine(slotKey === "meta" ? (variant ?? "date") : blogChoice("meta", "date"))}
          />
        </div>
      );

    /* The merchant's own words under the posts, as on the category page. */
    case "blog:text": {
      const written = (key: string) =>
        typeof live?.settings?.[key] === "string" ? (live.settings[key] as string).trim() : "";
      const left = live?.settings?.align === "left";
      return (
        <div className={cn("px-4 py-5", left ? "text-left" : "text-center")}>
          <h4 className="m-0 mb-2 text-[14px] font-semibold">{written("heading") || t("blogTextHeadingExample")}</h4>
          <p className={cn("max-w-[52ch] text-[11.5px] leading-relaxed text-current/55", left ? "" : "mx-auto")}>
            {written("body") || t("blogTextBodyExample")}
          </p>
        </div>
      );
    }

    /* ----------------------------------------------------------- article -- */

    /*
      A blog post, 2026-09-24: the shop's own (see `article`), drawn in the
      shop's order -- the title and its picture are one place and the line over
      the words the next, which is why the shop puts that line under a picture
      that sits under the title.
    */
    case "article:back":
      return <p className="px-4 py-3 text-[11px] text-current/55">← {t("articleAllPosts")}</p>;

    case "article:head": {
      const picture =
        article.pictured && variant !== "off" ? (
          <div className={variant === "top" ? "aspect-[21/8] bg-current/8" : "mt-3 aspect-[16/9] max-w-[34rem] rounded-md bg-current/8"} aria-hidden />
        ) : null;
      return (
        <div className={variant === "top" ? "" : "px-4 pt-5"}>
          {variant === "top" ? picture : null}
          <div className={variant === "top" ? "px-4 pt-4" : ""}>
            {article.tag ? (
              <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.1em] text-current/45">{article.tag}</p>
            ) : null}
            <h4 className="m-0 max-w-[26ch] text-[22px] font-semibold leading-[1.2] tracking-tight">{article.title}</h4>
            {variant === "under" ? picture : null}
          </div>
        </div>
      );
    }

    case "article:byline": {
      const named = variant === "author" && article.author;
      return (
        <div className="px-4 py-2.5">
          <p className="text-[11px] text-current/45">
            {named ? t("articleBylineLine", { name: article.author, date: article.date }) : article.date}
          </p>
          {/* Said rather than left to be puzzled over: the choice changed
              nothing a merchant can see, because the account has no name. */}
          {variant === "author" && !article.author ? (
            <p className="mt-1 text-[10px] italic text-current/40">{t("articleBylineNoName")}</p>
          ) : null}
        </div>
      );
    }

    case "article:body": {
      const words = article.words.length
        ? article.words
        : [
            { kind: "p" as const, text: t("articleBodyExample") },
            { kind: "p" as const, text: t("articleBodyTwo") },
            { kind: "quote" as const, text: t("articleQuoteExample") },
            { kind: "p" as const, text: t("articleBodyThree") },
          ];
      return (
        // Real sentences, because the choice is how WIDE a line of text runs,
        // and grey bars are the same shape at either width. Left-aligned like
        // the shop: every page starts where every other page starts.
        <div className={variant === "wide" ? "px-4 py-5" : "max-w-[34rem] px-4 py-5"}>
          {words.map((word, index) =>
            word.kind === "h" ? (
              <p key={index} className="mt-4 text-[14px] font-semibold leading-snug first:mt-0">
                {word.text}
              </p>
            ) : word.kind === "quote" ? (
              <p key={index} className="mt-4 border-l-2 border-current/25 pl-4 text-[13px] italic leading-[1.7] text-current/70 first:mt-0">
                {word.text}
              </p>
            ) : (
              <p key={index} className="mt-3.5 text-[12.5px] leading-[1.8] text-current/75 first:mt-0">
                {word.text}
              </p>
            ),
          )}
        </div>
      );
    }

    case "article:tags":
      return article.tags.length ? (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {article.tags.map((name) => (
            <span key={name} className="rounded-xs border border-current/15 px-3 py-1 text-[11px] text-current/60">
              {name}
            </span>
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-[11px] italic text-current/40">{t("articleNoTags")}</p>
      );

    case "article:prevNext": {
      // Newest first, as the shop lists them: the older post is the next one.
      const older = shopPosts[articleAt + 1];
      const newer = articleAt > 0 ? shopPosts[articleAt - 1] : undefined;
      return (
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          {older ? (
            <div className="rounded-md border border-current/12 p-3.5">
              <p className="text-[10px] uppercase tracking-[0.08em] text-current/40">← {t("articlePrev")}</p>
              <p className="mt-1.5 truncate text-[12.5px] font-semibold">{older.title}</p>
            </div>
          ) : null}
          {newer ? (
            <div className="rounded-md border border-current/12 p-3.5 sm:col-start-2 sm:text-right">
              <p className="text-[10px] uppercase tracking-[0.08em] text-current/40">{t("articleNext")} →</p>
              <p className="mt-1.5 truncate text-[12.5px] font-semibold">{newer.title}</p>
            </div>
          ) : null}
        </div>
      );
    }

    case "article:related": {
      // As the shop picks them: the ones sharing a tag first, then the newest.
      const others = shopPosts.filter((post) => post !== article);
      const alike = others.filter((post) => post.tags.some((tag) => article.tags.includes(tag)));
      const shelf = [...alike, ...others.filter((post) => !alike.includes(post))].slice(0, 3);
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("articleRelatedHeading")} />
          <PostCards posts={shelf} line={(post) => post.date || null} cards="full" columns={3} />
        </div>
      );
    }

    case "cart:heading":
      return (
        <div className="flex items-baseline justify-between gap-4 border-b border-current/10 px-4 py-4">
          <h4 className="m-0 text-[20px] font-medium tracking-tight">{t("cartTitle")}</h4>
          {variant === "plain" ? null : (
            <span className="text-[11px] underline underline-offset-4 text-current/55">{t("continueShopping")}</span>
          )}
        </div>
      );

    /**
     * What they are buying, on the left.
     *
     * Cards by default rather than a table: a table is a receipt, and a cart is
     * the last place a shopper looks at the thing itself before paying for it.
     * The picture, the size and the colour are what stop somebody ordering the
     * wrong one, and a row of columns shrinks all three to fit the narrowest of
     * them. The table is still offered, because a long cart reads faster as one.
     */
    case "cart:lines": {
      const lines = [
        { name: "Gradient Graphic T-shirt", size: "Large", colour: "White", qty: 1, price: "৳1,450" },
        { name: "Checkered Shirt", size: "Medium", colour: "Red", qty: 1, price: "৳1,800" },
        { name: "Skinny Fit Jeans", size: "Large", colour: "Blue", qty: 1, price: "৳2,400" },
      ];
      const stepper = (qty: number) => (
        <span className="inline-flex shrink-0 items-center rounded-full border border-current/15 text-[11px] leading-none">
          <span className="px-2.5 py-1.5 text-current/45">−</span>
          <span className="px-1.5 py-1.5 tabular-nums">{qty}</span>
          <span className="px-2.5 py-1.5 text-current/45">+</span>
        </span>
      );
      // Only the remove mark is coloured, and only because it is the one action
      // on this page a shopper cannot undo.
      const remove = (
        <span className="shrink-0 text-[13px] leading-none text-[#d64545]" aria-hidden>
          &#128465;
        </span>
      );

      if (variant === "table") {
        return (
          <div className="px-4 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)_7rem_5rem] gap-4 border-b border-current/10 pb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-current/45">
              <span>{t("colProduct")}</span>
              <span className="text-center">{t("colQuantity")}</span>
              <span className="text-right">{t("colTotal")}</span>
            </div>
            {lines.map((line) => (
              <div
                key={line.name}
                className="grid grid-cols-[minmax(0,1fr)_7rem_5rem] items-center gap-4 border-b border-current/10 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="size-12 shrink-0 rounded-sm bg-current/8" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{line.name}</span>
                    <span className="block truncate text-[10px] text-current/45">
                      {line.size} · {line.colour}
                    </span>
                  </span>
                </span>
                <span className="text-center">{stepper(line.qty)}</span>
                <span className="text-right text-[13px] font-semibold tabular-nums">{line.price}</span>
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="p-4">
          <div className="rounded-md border border-current/12">
            {lines.map((line, i) => (
              <div
                key={line.name}
                className={`flex items-start gap-3.5 p-3.5 ${i ? "border-t border-current/10" : ""}`}
              >
                <span className="size-16 shrink-0 rounded-sm bg-current/8" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 truncate text-[13px] font-semibold">{line.name}</span>
                    {remove}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-current/45">
                    {t("cartLineSize")}: <span className="text-current/65">{line.size}</span>
                  </span>
                  <span className="block text-[10px] text-current/45">
                    {t("cartLineColour")}: <span className="text-current/65">{line.colour}</span>
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[15px] font-semibold tabular-nums">{line.price}</span>
                    {stepper(line.qty)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /**
     * What it comes to, on the right.
     *
     * One panel: the sums, then the way out of the page. The promo row is the
     * coupon slot's, drawn here because a field floating under the panel is not
     * where anybody looks for it -- and the discount line above it appears on
     * the same condition, since a shop with no coupons has nothing to discount.
     */
    case "cart:total": {
      const coupon = settings?.coupon ?? "off";
      const full = variant !== "simple";
      const row = (label: string, value: string, tone = "") => (
        <div className={`flex justify-between text-[12px] tabular-nums ${tone || "text-current/60"}`}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      );
      return (
        <div className="p-4">
          <div className="rounded-md border border-current/12 p-4">
            <p className="mb-3 text-[15px] font-semibold">{t("orderSummary")}</p>
            {full ? (
              <div className="grid gap-2">
                {row(t("subtotal"), "৳5,650")}
                {coupon === "off" ? null : row(t("cartDiscountExample"), "−৳1,130", "text-[#d64545]")}
                {row(t("delivery"), "৳150")}
              </div>
            ) : null}
            <div
              className={`flex items-baseline justify-between gap-3 ${
                full ? "mt-3 border-t border-current/10 pt-3" : ""
              }`}
            >
              <span className="text-[13px] font-medium">{t("total")}</span>
              <span className="text-[19px] font-semibold tabular-nums">৳4,670</span>
            </div>

            {coupon === "off" ? null : coupon === "link" ? (
              <p className="mt-3 text-[11px] underline underline-offset-2 text-current/55">
                {t("couponLinkExample")}
              </p>
            ) : (
              <div className="mt-3 flex gap-2">
                <span className="flex h-9 flex-1 items-center rounded-full border border-current/15 bg-current/[0.04] px-3 text-[11px] text-current/40">
                  {t("couponPlaceholder")}
                </span>
                <span className="grid h-9 shrink-0 place-items-center rounded-full bg-foreground px-5 text-[11px] font-semibold text-background">
                  {t("couponApply")}
                </span>
              </div>
            )}

            <span className="mt-3 grid h-11 place-items-center rounded-full bg-shop-brand text-[12px] font-semibold text-shop-brand-foreground">
              {t("cartGoToCheckout")} &#8594;
            </span>
            {/* What delivery costs is said ONCE. The full shape has a row for
                it; the one-number shape has no rows at all, so it is said here
                instead -- and never in both places, which is what the page
                itself does. */}
            {full ? null : (
              <p className="mt-2 text-center text-[10px] text-current/45">{t("cartTotalNoteExample")}</p>
            )}
          </div>
        </div>
      );
    }

    case "cart:sticky":
      return (
        <div className="px-4 py-4">
          <p className="mb-2.5 text-[11.5px] text-current/55">{t("cartStickyExample")}</p>
          <div className="flex items-center gap-3 rounded-md border border-current/15 bg-current/5 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase tracking-[0.06em] text-current/45">{t("total")}</span>
              <span className="block text-[14px] font-semibold tabular-nums">৳4,670</span>
            </span>
            <span className="grid h-9 shrink-0 place-items-center rounded-full bg-shop-brand px-4 text-[11px] font-semibold text-shop-brand-foreground">
              {t("cartGoToCheckout")}
            </span>
          </div>
        </div>
      );

    case "cart:upsell":
      return (
        <div className="px-4 py-4">
          <SectionHead title={variant === "picks" ? t("cartUpsellPicksHeading") : t("cartUpsellHeading")} />
          <Cards items={BESTSELLERS} />
        </div>
      );

    case "cart:recent":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("recentHeading")} />
          <Cards items={ARRIVALS} />
        </div>
      );

    /*
      What this shop can ACTUALLY be paid with, which is not what this drew
      until 2026-09-24: it listed Rocket, Visa and Mastercard, and Paperbase has
      no card gateway at all. A merchant switching this on and finding two marks
      where the editor showed six is the same broken promise as a tile that does
      nothing.

      Cash on delivery always; bKash and Nagad where something in the cart asks
      for money up front, which is per product -- so they are drawn quieter, and
      the tile's note says when they appear.
    */
    case "cart:payments":
    case "checkout:payments":
      return (
        <div className="px-4 py-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-current/45">{t("paymentsHeading")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xs border border-current/15 px-2.5 py-1 text-[10px] text-current/60">
              {t("cashOnDelivery")}
            </span>
            {["bKash", "Nagad"].map((name) => (
              <span
                key={name}
                className="rounded-xs border border-dashed border-current/15 px-2.5 py-1 text-[10px] text-current/40"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      );

    /** What the page says when there is nothing in it. */
    case "cart:empty":
      return (
        <div className="border-t border-dashed border-current/15 px-4 py-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.06em] text-current/40">{t("cartEmptyWhen")}</p>
          {variant === "invite" ? (
            <div className="grid place-items-center gap-3 py-4 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-current/8 text-[15px]" aria-hidden>
                ⌂
              </span>
              <span>
                <span className="block text-[14px] font-medium">{t("cartEmptyHeadingExample")}</span>
                <span className="mt-1 block text-[11px] text-current/50">{t("cartEmptyBodyExample")}</span>
              </span>
              <span className="grid h-9 place-items-center rounded-xs bg-foreground px-5 text-[11px] font-semibold text-background">
                {t("cartEmptyButtonExample")}
              </span>
            </div>
          ) : (
            <p className="py-4 text-[12px] text-current/55">{t("cartEmptyTextExample")}</p>
          )}
        </div>
      );

    /*
      The fold-out rows that end the buying column, as the shop draws them
      (2026-09-25): an icon, a name and a plus, no lines between, then Share.
      Product details is always there; Shipping details, Exchange policy and a
      merchant's own rows only once the shop has written them -- the canvas
      shows what the shop will show, in the shop's own words. Under the right
      half, where the buying column is.
    */
    case "product:details": {
      const held = live?.settings ?? {};
      const said = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
      const rows: { key: string; title: string; Mark: LucideIcon }[] = [
        { key: "details", title: t("detailRowProduct"), Mark: ClipboardList },
      ];
      if (said(held.shipping_text)) rows.push({ key: "shipping", title: t("detailRowShipping"), Mark: Truck });
      if (said(held.exchange_text)) rows.push({ key: "exchange", title: t("detailRowExchange"), Mark: ArrowLeftRight });
      for (const block of live?.blocks ?? []) {
        if (block.type !== "row") continue;
        const { heading, body, icon } = block.settings ?? {};
        if (!said(heading) || !said(body)) continue;
        rows.push({ key: block.id, title: heading.trim(), Mark: ROW_MARKS[String(icon)] ?? Info });
      }
      return (
        <div className="grid gap-6 px-4 py-3 sm:grid-cols-2">
          <div aria-hidden className="hidden sm:block" />
          <div className="min-w-0">
            {rows.map(({ key, title, Mark }) => (
              <p key={key} className="flex items-center gap-3 py-2.5 text-[13px]">
                <Mark aria-hidden className="size-4 shrink-0 text-current/55" strokeWidth={1.6} />
                <span className="min-w-0 flex-1 truncate">{title}</span>
                <span aria-hidden className="text-[15px] leading-none text-current/70">+</span>
              </p>
            ))}
            <p className="mt-1 flex items-center gap-2 text-[12px] text-current/70">
              <Upload aria-hidden className="size-3.5" strokeWidth={1.8} />
              {t("detailRowShare")}
            </p>
          </div>
        </div>
      );
    }

    case "product:breadcrumb":
      return (
        <p className="px-4 py-3 text-[11px] text-current/45">
          {t("breadcrumbHomeExample")} · Men · <span className="text-current/70">Gradient Graphic T-shirt</span>
        </p>
      );

    case "product:reviews":
      return variant === "summary" ? (
        <div className="flex flex-wrap items-center gap-3 border-y border-current/12 px-4 py-4">
          <span className="text-[19px] font-semibold tabular-nums">4.7</span>
          <span className="text-[12px] text-current/45">★★★★★</span>
          <span className="text-[11.5px] text-current/55">{t("productReviewsCount")}</span>
        </div>
      ) : (
        <div className="px-4 py-4">
          <SectionHead title={t("productReviewsHeading")} />
          <div className="grid gap-3 sm:grid-cols-3">
            {/* The shop's own good reviews standing in for a product's, where it
                has some; the examples only for a shop with none yet. */}
            {(reviews?.length
              ? reviews.slice(0, 3).map((review) => [review.name, review.body])
              : [
                  ["Nusrat J.", t("reviewOne")],
                  ["Rafiq H.", t("reviewTwo")],
                  ["Tanvir A.", t("reviewThree")],
                ]
            ).map(([name, words]) => (
              <div key={name} className="rounded-md border border-current/12 p-3.5">
                <p className="text-[11px] text-current/70">★★★★★</p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-current/65">{words}</p>
                <p className="mt-3 flex items-center gap-2 text-[11px] font-medium">
                  <span className="size-6 shrink-0 rounded-full bg-current/12" aria-hidden />
                  {name}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case "product:faq":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("productFaqHeading")} />
          <div className="divide-y divide-current/10 border-y border-current/10">
            {[t("productFaqOne"), t("productFaqTwo")].map((q) => (
              <p key={q} className="flex items-center justify-between gap-3 py-3 text-[12px] text-current/70">
                {q}
                <span aria-hidden className="text-current/40">
                  +
                </span>
              </p>
            ))}
          </div>
        </div>
      );

    case "product:recent":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("recentHeading")} />
          <Cards items={ARRIVALS} />
        </div>
      );

    case "product:stickybuy":
      return (
        <div className="px-4 py-4">
          <p className="mb-2.5 text-[11.5px] text-current/55">{t("stickyBuyExample")}</p>
          <div className="flex items-center gap-3 rounded-md border border-current/15 bg-current/5 px-3 py-2.5">
            <span className="size-10 shrink-0 rounded-sm bg-current/10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium">Gradient Graphic T-shirt</span>
              <span className="block text-[13px] font-semibold tabular-nums">৳1,450</span>
            </span>
            <span className="grid h-9 shrink-0 place-items-center rounded-full bg-shop-brand px-5 text-[11px] font-semibold text-shop-brand-foreground">
              {t("addToCart")}
            </span>
          </div>
        </div>
      );

    case "product:related":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("relatedHeading")} />
          <Cards items={BESTSELLERS} />
        </div>
      );

    case "checkout:chrome":
      return variant === "full" ? (
        <ShopChrome page="header" slotKey="header" variant="bar" />
      ) : (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3.5 text-foreground">
          <span className="text-sm font-semibold tracking-[0.14em]">GADZILLA</span>
          <span className="text-[11px] text-current/55">{t("secureCheckout")}</span>
        </div>
      );

    // The same bar on both pages, standing on a different step of it.
    case "cart:steps":
    case "checkout:steps": {
      const here = page === "cart" ? 0 : 1;
      return (
        <div className="flex items-center justify-center gap-2 border-b border-current/10 px-4 py-3 text-[11px]">
          {[t("stepCart"), t("stepDetails"), t("stepDone")].map((name, i) => (
            <span key={name} className="flex items-center gap-2">
              {i ? <span className="block h-px w-6 bg-current/20" aria-hidden /> : null}
              <span className={i === here ? "font-semibold text-current" : "text-current/45"}>
                <span className="mr-1.5 tabular-nums">{i + 1}</span>
                {name}
              </span>
            </span>
          ))}
        </div>
      );
    }

    case "checkout:footerStyle":
      return variant === "same" ? (
        <ShopChrome page="footer" slotKey="footer" variant="columns" />
      ) : (
        <p className="border-t border-current/10 px-4 py-4 text-center text-[11px] text-current/50">
          {t("checkoutFooterExample")}
        </p>
      );

    /**
     * The right column: everything a shopper fills in before they can buy.
     *
     * Grouped and numbered, because a checkout is not one long form -- it is
     * three questions (who you are, where it goes, how you pay) and a shopper
     * who can see which one they are on can see how many are left. Every field
     * carries the mark of what it wants, so the shape is readable before a word
     * is typed.
     *
     * **No card fields.** The reference this was drawn from has a card number,
     * an expiry and a CVV; Paperbase has none of those -- `card_number` and
     * `cvv` appear nowhere in the API. It takes cash on delivery, or a mobile
     * transfer with a reference number. Drawing card boxes would have been a
     * payment method a merchant could switch on and no shopper could use.
     *
     * The two variants are the real `customer_form_variant`, so the preview
     * lists the actual fields rather than a count.
     */
    case "checkout:form": {
      const minimal = variant === "minimal";

      const group = (n: number, title: string, children: React.ReactNode) => (
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
              {n}
            </span>
            {title}
          </p>
          <div className="grid gap-2.5">{children}</div>
        </div>
      );

      const field = (Icon: typeof User, label: string, hint?: string) => (
        <span
          key={label}
          className="flex min-w-0 items-center gap-2 rounded-md border border-current/15 bg-current/[0.03] px-3 py-2.5"
        >
          <Icon className="size-3.5 shrink-0 text-current/35" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-current/40">
            {label}
            {hint ? <span className="block truncate text-[10px] text-current/25">{hint}</span> : null}
          </span>
        </span>
      );
      const pair = (a: React.ReactNode, b: React.ReactNode) => (
        <div className="grid grid-cols-2 gap-2.5">
          {a}
          {b}
        </div>
      );

      return (
        <div className="grid gap-5 px-4 py-4">
          {group(
            1,
            t("customerInfo"),
            <>
              {minimal
                ? field(User, t("fieldFullName"))
                : pair(field(User, t("fieldFirstName")), field(User, t("fieldLastName")))}
              {minimal ? null : field(Mail, t("fieldEmail"))}
              {field(Phone, t("fieldPhone"), "+880 1700 000000")}
            </>,
          )}

          {group(
            2,
            t("deliveryHeading"),
            <>
              {/* District and area are asked for in BOTH forms, and this drew
                  the short one with only an area until 2026-09-24. An order
                  REQUIRES a district whichever form asked -- see
                  `checkout_rules.MINIMAL_REQUIRED_FIELDS` -- so the short form
                  drawn here could not have placed one. A courier cannot
                  deliver to a district either, which is why the area is
                  required in both too. */}
              {minimal ? null : field(MapPin, t("fieldAddress"), t("fieldAddressHint"))}
              {pair(field(Map, t("fieldDistrict")), field(Map, t("fieldArea")))}
              <span className="flex items-center justify-between rounded-md border border-current/15 px-3 py-2.5 text-[11px]">
                <span className="flex items-center gap-2 text-current/65">
                  <span className="size-2.5 rounded-full border-[3px] border-current/45" aria-hidden />
                  {t("deliveryInside")}
                </span>
                <span className="tabular-nums text-current/65">৳150</span>
              </span>
            </>,
          )}

          {group(
            3,
            t("paymentHeading"),
            <>
              <div className="grid grid-cols-4 gap-2">
                {[
                  [Banknote, t("payCod")],
                  [Smartphone, "bKash"],
                  [Smartphone, "Nagad"],
                  [Smartphone, "Rocket"],
                ].map(([Icon, name], i) => {
                  const Mark = Icon as typeof User;
                  return (
                    <span
                      key={name as string}
                      className={`grid place-items-center gap-1 rounded-md border px-1 py-2.5 text-[9.5px] leading-tight ${
                        i === 0 ? "border-current/50 bg-current/[0.05] font-semibold" : "border-current/15 text-current/55"
                      }`}
                    >
                      <Mark className="size-4" aria-hidden />
                      <span className="truncate">{name as string}</span>
                    </span>
                  );
                })}
              </div>
              <p className="text-[10.5px] leading-relaxed text-current/45">{t("payCodNote")}</p>
            </>,
          )}
        </div>
      );
    }

    /**
     * The coupon control -- on both pages, and on neither of them is it the box.
     *
     * The promo row is drawn INSIDE the summary panel, where the reference
     * keeps it and where a shopper who typed a code one page ago looks for it
     * again. A band redrawing it here would put two of something a shopper sees
     * once in front of a merchant at the same time, so this says where the
     * choice lands instead -- the job the blog's card and meta bands do.
     *
     * It has no empty state on purpose: hatching it over when the answer is
     * "off" hides the only way to switch it on.
     */
    case "cart:coupon":
    case "checkout:coupon":
      return (
        <div className="flex items-baseline gap-2 px-4 pb-4 text-[11px]">
          <span className="shrink-0 uppercase tracking-[0.08em] text-current/40">{t("couponWhere")}</span>
          <span className="min-w-0 flex-1 truncate text-current/65">
            {variant === "off"
              ? t("couponOffExample")
              : variant === "link"
                ? t("couponLinkExample")
                : t("couponPlaceholder")}
          </span>
        </div>
      );

    /**
     * The merchant's own words, and the button they come before.
     *
     * The button is drawn here rather than with the form because this place is
     * defined by where it sits: a banner on its own is not something a merchant
     * would recognise, and a banner directly above Place order is.
     */
    case "checkout:beforePay": {
      // The merchant's own words wherever they have written any -- this is
      // THEIR message, and an example standing in for it on the canvas while
      // the shop draws something else is the "Bags" problem again. The example
      // is what an empty box is for: showing the shape.
      const said =
        typeof live?.settings?.before_pay_text === "string"
          ? live.settings.before_pay_text.trim()
          : "";
      const banner =
        variant === "warning" ? (
          // The amber is in the edge and the fill, not the words: the canvas
          // takes the dashboard's own ground, and a fixed dark ink disappears
          // on the dark one.
          <p className="mb-3 rounded-xs border border-[#b4571f]/45 bg-[#b4571f]/12 px-3 py-2.5 text-[11px] leading-relaxed">
            {said || t("beforePayWarningExample")}
          </p>
        ) : variant === "note" ? (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-current/55">
            {said || t("beforePayNoteExample")}
          </p>
        ) : null;
      return (
        <div className="px-4 pb-4">
          {banner}
          {/* The same near-black the rest of the mock shop fills a button with.
              Not `bg-current`: the label sets `color`, so currentColor would
              paint the button in the label's colour and it would disappear. */}
          <span className="flex h-11 items-center justify-center gap-2 rounded-full bg-shop-brand text-[12px] font-semibold text-shop-brand-foreground">
            <Lock className="size-3.5" aria-hidden />
            {t("placeOrder")}
          </span>
          <p className="mt-2 text-center text-[10px] text-current/45">{t("placeOrderSafe")}</p>
        </div>
      );
    }

    /**
     * The left column: the order, and whether it is still the shopper's to change.
     *
     * Leaving the steppers on is the shop's own behaviour today. Turning them
     * off is a real decision some shops make -- a cart that cannot be edited at
     * the till is one fewer way to talk yourself out of buying -- so it is
     * offered rather than assumed.
     */
    case "checkout:summary": {
      const fixed = variant === "fixed";
      const coupon = settings?.coupon ?? "off";
      const lines = [
        { name: "Gradient Graphic T-shirt", size: "Large", colour: "White", qty: 1, price: "৳1,450" },
        { name: "Checkered Shirt", size: "Medium", colour: "Red", qty: 1, price: "৳1,800" },
        { name: "Skinny Fit Jeans", size: "Large", colour: "Blue", qty: 1, price: "৳2,400" },
      ];
      return (
        // A panel, because the shop's own summary is one -- and because the
        // column is shorter than the form beside it, so without an edge the
        // space under it reads as a hole rather than as the page.
        //
        // Drawn in the cart's language on purpose: a shopper meets these two
        // pages one after the other, and the same order looking like two
        // different orders is how somebody stops to check they are buying what
        // they think they are.
        <div className="m-4 rounded-md border border-current/12 p-4">
          <p className="mb-3 text-[15px] font-semibold">{t("orderSummary")}</p>

          <div className="rounded-md border border-current/12">
            {lines.map((line, i) => (
              <div
                key={line.name}
                className={`flex items-start gap-3 p-3 ${i ? "border-t border-current/10" : ""}`}
              >
                <span className="size-14 shrink-0 rounded-sm bg-current/8" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold">{line.name}</span>
                  <span className="mt-0.5 block text-[10px] text-current/45">
                    {t("cartLineSize")}: <span className="text-current/65">{line.size}</span>
                  </span>
                  <span className="block text-[10px] text-current/45">
                    {t("cartLineColour")}: <span className="text-current/65">{line.colour}</span>
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="text-[14px] font-semibold tabular-nums">{line.price}</span>
                    {fixed ? (
                      <span className="text-[11px] tabular-nums text-current/50">× {line.qty}</span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-current/15 text-[11px] leading-none">
                        <span className="px-2.5 py-1.5 text-current/45">−</span>
                        <span className="px-1.5 py-1.5 tabular-nums">{line.qty}</span>
                        <span className="px-2.5 py-1.5 text-current/45">+</span>
                      </span>
                    )}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 text-[12px] text-current/60">
            <div className="flex justify-between tabular-nums">
              <span>{t("subtotal")}</span>
              <span>৳5,650</span>
            </div>
            {/* Only when there is a field to type a code into. A shop with no
                coupons has nothing to take off, on either page. */}
            {coupon === "off" ? null : (
              <div className="flex justify-between tabular-nums text-[#d64545]">
                <span>{t("cartDiscountExample")}</span>
                <span>−৳1,130</span>
              </div>
            )}
            <div className="flex justify-between tabular-nums">
              <span>{t("delivery")}</span>
              <span>৳150</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-current/10 pt-3">
            <span className="text-[13px] font-medium">{t("total")}</span>
            <span className="text-[19px] font-semibold tabular-nums">৳4,670</span>
          </div>

          {/* Inside the panel, exactly where the cart puts it. */}
          {coupon === "off" ? null : coupon === "link" ? (
            <p className="mt-3 text-[11px] underline underline-offset-2 text-current/55">{t("couponLinkExample")}</p>
          ) : (
            <div className="mt-3 flex gap-2">
              <span className="flex h-9 flex-1 items-center rounded-full border border-current/15 bg-current/[0.04] px-3 text-[11px] text-current/40">
                {t("couponPlaceholder")}
              </span>
              <span className="grid h-9 shrink-0 place-items-center rounded-full bg-foreground px-5 text-[11px] font-semibold text-background">
                {t("couponApply")}
              </span>
            </div>
          )}
        </div>
      );
    }

    case "checkout:after":
      return <p className="px-4 py-3 text-center text-[11px] text-current/55">{t("afterExample")}</p>;

    // The arrangement is the whole header; search and the marks draw it too,
    // with the value they are showing, so a merchant sees the choice in place.
    case "header:layout":
      return headerDrawing({ layout: variant });

    case "header:search":
      return headerDrawing({ search: variant });

    case "header:sticky":
      return (
        <p className="px-4 py-3 text-center text-[12px] text-current/55">
          {variant === "off" ? t("stickyOffExample") : t("stickyExample")}
        </p>
      );

    case "header:marks":
      return headerDrawing({ marks: variant });

    // The arrangement is the whole footer; every other footer place draws its
    // own part, from the same function, with the value it is showing.
    case "footer:layout":
      return <ShopChrome page={page} slotKey="footer" variant={variant} settings={settings} live={live} shop={shop} />;

    case "footer:contact": {
      const parts = footerParts({ contact: variant ?? "full" });
      return parts.band(parts.shopBlock);
    }
    case "footer:social": {
      const parts = footerParts({ social: variant ?? "names" });
      return parts.band(parts.social);
    }
    case "footer:payments": {
      const parts = footerParts({ payments: variant ?? "off" });
      return parts.band(parts.payments);
    }
    case "footer:bottom": {
      const parts = footerParts({ bottom: variant ?? "copyright" });
      return parts.band(parts.bottom);
    }

    /**
     * Nothing drew this slot.
     *
     * Marked, because the grey bars are plausible enough to be mistaken for a
     * preview -- two coupon cases were deleted by an over-wide edit and rendered
     * as this for a whole commit before anyone noticed. `data-fallback` is what
     * `theme-editor-previews.test.tsx` looks for.
     */
    default:
      return (
        <div data-fallback="1" className="space-y-2 px-4 py-4">
          <Line />
          <Line w="60%" />
        </div>
      );
  }
}
