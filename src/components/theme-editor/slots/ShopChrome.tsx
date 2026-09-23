"use client";

import { useTranslations } from "next-intl";
import {
  Banknote,
  BadgeCheck,
  CalendarCheck,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  Gift,
  Hash,
  Headphones,
  Heart,
  Lock,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  User,
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

import type { ThemeSection } from "@/lib/theme-editor/api";
import { cn } from "@/lib/utils";
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

function SectionHead({ title, link }: { title: string; link?: string }) {
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

/**
 * Post cards, drawn the way the blog's own two settings say.
 *
 * The shelves do not own this: `cards` decides what a card carries and `meta`
 * decides the line under it, and both are chosen on their own bands. Passing
 * them through is what lets a merchant change the card shape and watch every
 * shelf on the page change with it.
 */
function PostCards({
  posts,
  cards,
  meta,
}: {
  posts: { title: string; excerpt: string; tag: string }[];
  cards: string;
  meta: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {posts.map((post) => (
        <div key={post.title} className="min-w-0">
          {cards === "words" ? null : (
            <div className="relative overflow-hidden rounded-md bg-current/8 aspect-[4/3]" aria-hidden>
              <span className="absolute left-2 top-2 rounded-full bg-[color:var(--color-background)]/85 px-2 py-0.5 text-[9px] font-medium text-current/70">
                {post.tag}
              </span>
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
          {meta ? <p className="mt-1.5 text-[10px] text-current/40">{meta}</p> : null}
        </div>
      ))}
    </div>
  );
}

const ARRIVALS: Card[] = [
  { name: "Merino Scarf", price: "৳1,180" },
  { name: "Wool Cap", price: "৳740" },
  { name: "Suede Loafer", price: "৳3,600", was: "৳4,200", off: 15 },
  { name: "Cotton Socks", price: "৳320" },
];

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
}) {
  const t = useTranslations("themeEditor.slots");

  /*
    The category page is a TEMPLATE, not a page: one drawing stands for every
    category the shop has. It stands for them as the merchant's own first
    department wherever there is one -- a merchant reading about somebody
    else's aisle cannot tell whether this is their shop or a brochure -- and as
    a plain example only for a shop that has no departments yet.
  */
  const exampleCategory = departments?.[0]?.label || t("catExampleCategory");

  // The announcement and the masthead are drawn by key rather than by page:
  // both live in the header group, so every page shows them and only the Header
  // entry in the picker edits them.
  if (slotKey === "notice") {
    // The merchant's own line when this place is wired, an example when it is
    // not -- and an example again when they have not written one yet, because a
    // strip drawn empty reads as a bug rather than as a blank.
    // One ground, not a choice: the owner took the colour setting off the bar
    // on 2026-09-22, because the palette already decides what the accent is.
    const text = live?.settings?.text;
    const written = typeof text === "string" ? text.trim() : "";
    return (
      <p className="border-b border-border bg-muted px-4 py-2 text-center text-[11px] uppercase tracking-[0.06em] text-current/75">
        {written || t("noticeExample")}
      </p>
    );
  }

  if (slotKey === "header") {
    const set = settings ?? {};
    const layout = variant ?? set.layout ?? "bar";
    const search = set.search ?? "box";
    const marks = (set.marks ?? "off") === "on" ? 4 : 2;
    const logo = <span className="text-sm font-semibold tracking-[0.14em]">GADZILLA</span>;
    // Search is a mark in the row unless it has a box of its own, and the
    // account and wishlist marks appear only when they are switched on.
    const icons = (
      <span className="flex shrink-0 items-center gap-2.5">
        {search === "icon" ? <span className="size-4 rounded-full border border-current/35" /> : null}
        {Array.from({ length: marks }, (_, i) => (
          <span key={i} className="size-4 rounded-xs bg-current/25" />
        ))}
      </span>
    );
    const nav = (centred: boolean) => (
      <div
        className={`flex gap-4 overflow-hidden px-4 py-2.5 text-[10px] uppercase tracking-[0.08em] text-current/50 ${
          centred ? "justify-center" : ""
        }`}
      >
        {["Audio", "Men", "Wearables", "Women", "Kids"].map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
    );
    const bar = (children: React.ReactNode) => (
      <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3 text-foreground">{children}</div>
    );

    if (layout === "masthead") {
      return (
        <div>
          <div className="border-b border-border bg-muted px-4 py-5 text-center text-foreground">{logo}</div>
          <div className="border-b border-current/10">{nav(true)}</div>
        </div>
      );
    }
    if (layout === "split") {
      return (
        <div className="border-b border-current/10">
          {bar(
            <>
              <span className="flex flex-1 gap-3 overflow-hidden text-[10px] uppercase tracking-[0.08em] text-current/65">
                <span>Men</span>
                <span>Women</span>
                <span>Kids</span>
              </span>
              {logo}
              <span className="flex flex-1 justify-end">{icons}</span>
            </>,
          )}
        </div>
      );
    }
    if (layout === "inline") {
      return (
        <div className="border-b border-current/10">
          {bar(
            <>
              {logo}
              <span className="flex flex-1 gap-3.5 overflow-hidden text-[10px] uppercase tracking-[0.08em] text-current/65">
                {["Audio", "Men", "Wearables", "Women"].map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </span>
              {icons}
            </>,
          )}
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
              <span className="flex-1" />
              {icons}
            </>,
          )}
        </div>
      );
    }
    // bar: the shop's name, a search box across the middle, the nav underneath.
    return (
      <div>
        {bar(
          <>
            {logo}
            {search === "box" ? (
              <span className="h-7 flex-1 rounded-xs bg-current/12" />
            ) : (
              <span className="flex-1" />
            )}
            {icons}
          </>,
        )}
        <div className="border-b border-current/10">{nav(false)}</div>
      </div>
    );
  }

  if (slotKey === "footer") {
    const set = settings ?? {};
    const layout = variant ?? set.layout ?? "columns";
    const heading = (text: string) => (
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">{text}</p>
    );
    const links = (items: string[]) =>
      items.map((link) => (
        <p key={link} className="mb-1.5 text-[11px] leading-relaxed">
          {link}
        </p>
      ));

    const contact = set.contact ?? "full";
    const shop = (
      <div>
        {heading("Gadzilla")}
        {contact === "off" ? null : contact === "email" ? (
          <p className="text-[11px]">hello@gadzilla.com</p>
        ) : (
          <>
            <p className="text-[11px] leading-relaxed">12 Gulshan Avenue, Dhaka 1212</p>
            <p className="mt-1.5 text-[11px]">+880 1700 000000</p>
          </>
        )}
      </div>
    );

    const columns = [
      { head: "Information", items: ["About us", "Blog", "Privacy policy"] },
      { head: "Customer service", items: ["Contact us", "Returns", "Track order"] },
      { head: "Company", items: ["Careers", "Wholesale", "Stores"] },
    ];

    /**
     * The sign-up sits AFTER the links, not above them.
     *
     * At the top it competed with the shop's own name for the first line of the
     * footer and read as something stuck on. A shopper who has scrolled this far
     * has finished looking; the ask belongs after they have found what they came
     * for, and before the marks that reassure them. It gets its own panel rather
     * than a bare rule so it reads as a thing and not a stray form.
     */
    const newsletter =
      (set.newsletter ?? "off") === "off" ? null : (
        <div
          className={`mt-6 flex flex-wrap items-center gap-4 rounded-sm bg-current/[0.06] px-4 py-4${
            layout === "centred" || layout === "minimal" ? " justify-center text-center" : ""
          }`}
        >
          <p className="min-w-0 flex-1 text-[12px] font-semibold text-foreground">
            {set.newsletter === "whatsapp" ? t("signupWhatsappHeading") : t("signupEmailHeading")}
          </p>
          <div className="flex w-full max-w-xs gap-2 sm:w-auto">
            <span className="h-9 flex-1 rounded-xs bg-current/12 sm:w-44" />
            <span className="grid h-9 shrink-0 place-items-center rounded-xs bg-white px-4 text-[11px] font-medium text-[#1a1a1a]">
              {set.newsletter === "whatsapp" ? t("signupWhatsappButton") : t("signupEmailButton")}
            </span>
          </div>
        </div>
      );

    const social =
      (set.social ?? "marks") === "off" ? null : (set.social ?? "marks") === "names" ? (
        <p className="mt-5 text-[11px]">Facebook · Instagram · YouTube · TikTok</p>
      ) : (
        <div className="mt-5 flex gap-2.5">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="size-8 rounded-full bg-current/12" />
          ))}
        </div>
      );

    const payments =
      (set.payments ?? "on") === "off" ? null : (
        <div className="mt-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-current/45">{t("paymentsHeading")}</p>
          <div className="flex flex-wrap gap-2">
            {["bKash", "Nagad", "Rocket", "Visa", "Mastercard", t("cashOnDelivery")].map((name) => (
              <span key={name} className="rounded-xs border border-current/15 px-2.5 py-1 text-[10px] text-current/70">
                {name}
              </span>
            ))}
          </div>
        </div>
      );

    const bottom =
      (set.bottom ?? "copyright") === "policies" ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-current/12 pt-4 text-[10px] text-current/45">
          <span>© 2026 Gadzilla · powered by Paperbase</span>
          <span>Privacy · Returns · Terms</span>
        </div>
      ) : (
        <p className="mt-5 border-t border-current/12 pt-4 text-[10px] text-current/45">
          © 2026 Gadzilla — All rights reserved · powered by Paperbase
        </p>
      );

    const shell = (children: React.ReactNode, centred = false) => (
      <div className={`border-t border-border bg-muted px-5 py-6 text-current/65${centred ? " text-center" : ""}`}>
        {children}
        {newsletter}
        {social}
        {payments}
        {bottom}
      </div>
    );

    if (layout === "minimal") {
      return shell(
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">Gadzilla</p>
          <p className="mt-2.5 text-[11px]">About · Contact · Returns · Privacy</p>
        </>,
        true,
      );
    }
    if (layout === "centred") {
      return shell(
        <>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground">Gadzilla</p>
          {contact === "off" ? null : (
            <p className="mt-2.5 text-[11px]">
              {contact === "email" ? "hello@gadzilla.com" : "12 Gulshan Avenue, Dhaka 1212 · +880 1700 000000"}
            </p>
          )}
          <p className="mt-3 text-[11px]">About us · Blog · Contact us · Returns · Privacy policy</p>
        </>,
        true,
      );
    }
    if (layout === "split") {
      return shell(
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          {shop}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {columns.slice(0, 2).map((column) => (
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
        {shop}
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
          <span className="mt-1 grid h-9 w-fit place-items-center rounded-full bg-foreground px-6 text-[11.5px] font-semibold text-background">
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
          {heading ? <SectionHead title={heading} /> : null}
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
          {heading ? <SectionHead title={heading} /> : null}
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
          <SectionHead title={t("featuredHeading")} link={t("browseAll")} />
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
              <SectionHead title={name} link={t("browseAll")} />
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
          <SectionHead title={t("bestsellersHeading")} link={t("browseAll")} />
          <Cards items={BESTSELLERS} />
        </div>
      );

    case "home:arrivals":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("arrivalsHeading")} link={t("browseAll")} />
          <Cards items={ARRIVALS} />
        </div>
      );

    case "home:brands":
      return (
        <div className="px-4 py-5">
          <SectionHead title={t("brandsHeading")} />
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="h-8 rounded-xs bg-current/8" />
            ))}
          </div>
        </div>
      );

    case "home:reviews":
      return variant === "quote" ? (
        <div className="px-6 py-6 text-center">
          <p className="text-[14px] leading-relaxed text-current/70">“{t("reviewsQuoteExample")}”</p>
          <p className="mt-2.5 text-[11px] uppercase tracking-[0.08em] text-current/45">Nusrat J. · Dhaka</p>
        </div>
      ) : (
        <div className="px-4 py-4">
          <SectionHead title={t("reviewsHeading")} />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Nusrat J.", t("reviewOne")],
              ["Rafiq H.", t("reviewTwo")],
              ["Tanvir A.", t("reviewThree")],
            ].map(([name, words]) => (
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

    case "home:video":
      return (
        <div className="grid h-[150px] place-items-center bg-current/8 px-4">
          <span className="grid size-12 place-items-center rounded-full bg-current/15 text-[15px]" aria-hidden>
            ▶
          </span>
        </div>
      );

    case "home:posts":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("postsHeading")} link={t("browseAll")} />
          <div className="grid gap-3 sm:grid-cols-3">
            {[t("postOne"), t("postTwo"), t("postThree")].map((title) => (
              <div key={title} className="min-w-0">
                <div className="aspect-[16/10] rounded-xs bg-current/8" />
                <p className="mt-2 text-[12px] font-medium leading-snug">{title}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "home:signup":
      return (
        <div className="bg-current/6 px-6 py-6 text-center">
          <p className="text-[14px] font-semibold">
            {variant === "whatsapp" ? t("signupWhatsappHeading") : t("signupEmailHeading")}
          </p>
          <div className="mx-auto mt-3 flex max-w-sm gap-2">
            <span className="h-9 flex-1 rounded-xs bg-current/10" />
            <span className="grid h-9 place-items-center rounded-xs bg-foreground px-4 text-[11px] text-background">
              {variant === "whatsapp" ? t("signupWhatsappButton") : t("signupEmailButton")}
            </span>
          </div>
        </div>
      );

    case "home:faq":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("faqHeading")} />
          <div className="divide-y divide-current/10 border-y border-current/10">
            {[t("faqOne"), t("faqTwo"), t("faqThree")].map((q) => (
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
              <span className="grid h-11 flex-1 place-items-center rounded-full bg-foreground text-[12px] font-semibold text-background">
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

    case "cart:trust":
    case "checkout:trust":
      return (
        <p className="border-t border-current/10 px-4 py-3 text-center text-[11px] uppercase tracking-[0.06em] text-current/55">
          {page === "product" ? t("trustExample") : t("trustLineExample")}
        </p>
      );

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
      return (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {groups.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-current/15 px-3 py-1 text-[11px] text-current/60"
            >
              {name}
              <span className="text-current/35" aria-hidden>
                ▾
              </span>
            </span>
          ))}
        </div>
      );
    }

    /*
      Words under the grid, and the merchant's own the moment they have typed
      any -- a wired place drawing a stock example is a place that still looks
      like a brochure. Each half falls back on its own: somebody who has written
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
            {heading || t("catTextHeadingExample")}
          </h4>
          <p
            className={cn(
              "max-w-[52ch] text-[11.5px] leading-relaxed text-current/55",
              left ? "" : "mx-auto",
            )}
          >
            {body || t("catTextBodyExample")}
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
            {t("searchResultsFor")} <span className="italic">“bag”</span>
            {variant === "plain" ? null : (
              <span className="ml-2 text-[13px] font-normal text-current/45">({t("catCountExample", { count: 7 })})</span>
            )}
          </h4>
        </div>
      );

    case "search:categories":
      return (
        <div className="px-4 py-4">
          <p className="mb-2.5 text-[11px] font-semibold">{t("searchCategoriesHeading")}</p>
          <div className="flex flex-wrap gap-2">
            {["Bags", "Accessories", "Travel"].map((name) => (
              <span key={name} className="rounded-full border border-current/15 px-3 py-1 text-[11px] text-current/60">
                {name}
              </span>
            ))}
          </div>
        </div>
      );

    case "search:suggestions":
      return (
        <div className="px-4 py-4">
          <p className="mb-2 text-[11px] font-semibold">{t("searchSuggestionsHeading")}</p>
          <p className="text-[11px] text-current/55">
            {["Crossbody Bag", "Canvas Tote", "Laptop Bag"].join(" · ")}
          </p>
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
                <span className="block text-[14px] font-medium">{t("searchEmptyHeadingExample")}</span>
                <span className="mt-1 block text-[11px] text-current/50">{t("searchEmptyBodyExample")}</span>
              </span>
              <span className="flex flex-wrap justify-center gap-2">
                {["Bags", "Shirts", "Shoes"].map((name) => (
                  <span key={name} className="rounded-full border border-current/20 px-3 py-1 text-[11px]">
                    {name}
                  </span>
                ))}
              </span>
            </div>
          ) : (
            <p className="py-3 text-[12px] text-current/55">{t("searchEmptyTextExample")}</p>
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
                    <span className="grid h-9 shrink-0 place-items-center rounded-full bg-foreground px-4 text-[11px] font-semibold text-background">
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
                  <span className="mt-2 grid h-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
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

    case "account:door": {
      const lookup = variant === "lookup";
      return (
        <div className="border-b border-dashed border-current/15 px-4 py-5">
          <p className="mb-3 text-[10px] uppercase tracking-[0.06em] text-current/40">{t("accountDoorWhen")}</p>
          <div className="mx-auto max-w-[23rem] rounded-md border border-current/12 p-5">
            <p className="mb-1 text-[15px] font-semibold">
              {lookup ? t("accountLookupHeading") : t("accountSignInHeading")}
            </p>
            <p className="mb-4 text-[11px] leading-relaxed text-current/50">
              {lookup ? t("accountLookupBody") : t("accountSignInBody")}
            </p>
            <div className="grid gap-2.5">
              <span className="flex items-center gap-2 rounded-md border border-current/15 bg-current/[0.03] px-3 py-2.5">
                <Phone className="size-3.5 shrink-0 text-current/35" aria-hidden />
                <span className="text-[11.5px] text-current/40">{t("fieldPhone")}</span>
              </span>
              {lookup ? (
                <span className="flex items-center gap-2 rounded-md border border-current/15 bg-current/[0.03] px-3 py-2.5">
                  <Hash className="size-3.5 shrink-0 text-current/35" aria-hidden />
                  <span className="text-[11.5px] text-current/40">{t("accountOrderNumber")}</span>
                </span>
              ) : null}
              <span className="grid h-10 place-items-center rounded-full bg-foreground text-[11.5px] font-semibold text-background">
                {lookup ? t("accountLookupButton") : t("accountSignInButton")}
              </span>
            </div>
          </div>
        </div>
      );
    }

    case "account:greeting":
      return (
        <div className="px-4 py-5">
          <h4 className="m-0 text-[19px] font-medium tracking-tight">
            {variant === "name" ? t("accountGreetingExample") : t("accountTitleExample")}
          </h4>
        </div>
      );

    case "account:panels": {
      const panels =
        variant === "everything"
          ? [t("accountTabOrders"), t("accountTabDetails"), t("accountTabAddresses"), t("wishTitleExample")]
          : variant === "details"
            ? [t("accountTabOrders"), t("accountTabDetails")]
            : [t("accountTabOrders")];
      return (
        <div className="flex flex-wrap gap-2 border-b border-current/10 px-4 py-3">
          {panels.map((name, i) => (
            <span
              key={name}
              className={
                i === 0
                  ? "rounded-xs bg-foreground px-3 py-1 text-[11px] text-background"
                  : "rounded-xs border border-current/15 px-3 py-1 text-[11px] text-current/60"
              }
            >
              {name}
            </span>
          ))}
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

    case "blog:heading":
      return (
        <div className="px-4 py-5">
          <h4 className="m-0 text-[20px] font-medium tracking-tight">{t("blogTitleExample")}</h4>
          <p className="mt-1.5 max-w-[46ch] text-[11.5px] leading-relaxed text-current/55">{t("blogIntroExample")}</p>
        </div>
      );

    case "blog:search":
      return (
        <div className="flex gap-2 px-4 py-3">
          <span className="flex h-9 flex-1 items-center gap-2 rounded-full border border-current/15 bg-current/[0.04] px-3.5 text-[11px] text-current/40">
            <Search className="size-3.5 shrink-0 text-current/30" aria-hidden />
            {t("blogSearchPlaceholder")}
          </span>
          <span className="grid h-9 shrink-0 place-items-center rounded-full bg-foreground px-5 text-[11px] font-semibold text-background">
            {t("blogSearchButton")}
          </span>
        </div>
      );

    case "blog:tags":
      return (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {[t("blogTagAll"), "Care", "Materials", "Behind the seams", "Stockists"].map((name, i) => (
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
     * The featured shelf, or one post given the whole width.
     *
     * `is_featured` already marks them; the only question is whether four small
     * ones or one large one does more for a blog whose best post is the reason
     * anybody is on the page.
     */
    case "blog:featured": {
      const meta = settings?.meta ?? "date";
      const cardMeta =
        meta === "reads" ? t("blogReadsExample", { count: 1240 }) : meta === "none" ? null : "12 Sep 2026";
      if (variant === "hero") {
        return (
          <div className="px-4 py-4">
            <SectionHead title={t("blogFeaturedHeadingExample")} />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="aspect-[16/10] rounded-md bg-current/8" aria-hidden />
              <div className="flex flex-col justify-center gap-2">
                <p className="w-fit rounded-full bg-current/8 px-2.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-current/55">
                  {POSTS[0].tag}
                </p>
                <p className="text-[17px] font-semibold leading-snug">{POSTS[0].title}</p>
                <p className="text-[11.5px] leading-relaxed text-current/55">{POSTS[0].excerpt}</p>
                {cardMeta ? <p className="text-[10px] text-current/40">{cardMeta}</p> : null}
                <p className="mt-0.5 text-[11px] font-medium underline underline-offset-4">{t("blogReadOn")}</p>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("blogFeaturedHeadingExample")} />
          <PostCards posts={POSTS} meta={cardMeta} cards={settings?.cards ?? "full"} />
        </div>
      );
    }

    case "blog:latest": {
      const meta = settings?.meta ?? "date";
      const cardMeta =
        meta === "reads" ? t("blogReadsExample", { count: 1240 }) : meta === "none" ? null : "12 Sep 2026";
      if (variant === "rows") {
        return (
          <div className="px-4 py-4">
            <SectionHead title={t("blogLatestHeadingExample")} />
            <div className="grid gap-3">
              {POSTS.slice(0, 3).map((post) => (
                <div key={post.title} className="flex items-center gap-3.5 border-b border-current/10 pb-3.5">
                  <span className="h-16 w-24 shrink-0 rounded-md bg-current/8" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9.5px] uppercase tracking-[0.08em] text-current/40">{post.tag}</span>
                    <span className="mt-0.5 block truncate text-[13px] font-semibold">{post.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-current/50">{post.excerpt}</span>
                  </span>
                  {cardMeta ? <span className="shrink-0 text-[10px] text-current/40">{cardMeta}</span> : null}
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("blogLatestHeadingExample")} />
          <PostCards posts={POSTS} meta={cardMeta} cards={settings?.cards ?? "full"} />
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
            posts={POSTS.slice(0, 2)}
            cards={slotKey === "cards" ? (variant ?? "full") : (settings?.cards ?? "full")}
            meta={
              slotKey === "meta"
                ? variant === "reads"
                  ? t("blogReadsExample", { count: 1240 })
                  : variant === "none"
                    ? null
                    : "12 Sep 2026"
                : "12 Sep 2026"
            }
          />
        </div>
      );

    case "blog:text":
      return (
        <div className="px-4 py-5 text-center">
          <h4 className="m-0 mb-2 text-[14px] font-semibold">{t("blogTextHeadingExample")}</h4>
          <p className="mx-auto max-w-[52ch] text-[11.5px] leading-relaxed text-current/55">{t("blogTextBodyExample")}</p>
        </div>
      );

    /* ----------------------------------------------------------- article -- */

    case "article:back":
      return <p className="px-4 py-3 text-[11px] text-current/55">← {t("articleBackExample")}</p>;

    case "article:head":
      if (variant === "picture") {
        return (
          <div>
            <div className="aspect-[21/8] bg-current/8" aria-hidden />
            <div className="px-4 pt-4">
              <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.1em] text-current/45">{POSTS[0].tag}</p>
              <h4 className="m-0 max-w-[26ch] text-[22px] font-semibold leading-[1.2] tracking-tight">
                {POSTS[0].title}
              </h4>
            </div>
          </div>
        );
      }
      return (
        <div className="px-4 pt-5">
          <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.1em] text-current/45">{POSTS[0].tag}</p>
          <h4 className="m-0 max-w-[26ch] text-[22px] font-semibold leading-[1.2] tracking-tight">{POSTS[0].title}</h4>
        </div>
      );

    case "article:byline":
      return (
        <p className="px-4 py-2.5 text-[11px] text-current/45">
          {variant === "author" ? t("articleBylineExample") : "12 September 2026"}
        </p>
      );

    case "article:body": {
      const wide = variant === "wide";
      return (
        <div className={wide ? "px-4 py-5" : "mx-auto max-w-[34rem] px-4 py-5"}>
          {/* Real paragraphs. The choice on this slot is how WIDE a line of text
              runs, and that cannot be judged against grey bars of a fixed
              length -- they are the same shape at either setting. */}
          <p className="text-[12.5px] leading-[1.8] text-current/75">{t("articleBodyExample")}</p>
          <p className="mt-3.5 text-[12.5px] leading-[1.8] text-current/70">{t("articleBodyTwo")}</p>
          <p className="mt-4 border-l-2 border-current/25 pl-4 text-[13px] italic leading-[1.7] text-current/70">
            {t("articleQuoteExample")}
          </p>
          <p className="mt-4 text-[12.5px] leading-[1.8] text-current/70">{t("articleBodyThree")}</p>
        </div>
      );
    }

    case "article:tags":
      return (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {["Care", "Materials"].map((name) => (
            <span key={name} className="rounded-full border border-current/15 px-3 py-1 text-[11px] text-current/60">
              {name}
            </span>
          ))}
        </div>
      );

    case "article:prevNext":
      return (
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          {[
            { dir: `← ${t("articlePrev")}`, title: POSTS[1].title, align: "" },
            { dir: `${t("articleNext")} →`, title: POSTS[2].title, align: "sm:text-right" },
          ].map((item) => (
            <div key={item.dir} className={`rounded-md border border-current/12 p-3.5 ${item.align}`}>
              <p className="text-[10px] uppercase tracking-[0.08em] text-current/40">{item.dir}</p>
              <p className="mt-1.5 truncate text-[12.5px] font-semibold">{item.title}</p>
            </div>
          ))}
        </div>
      );

    case "article:related":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("articleRelatedHeadingExample")} />
          <PostCards posts={POSTS} meta="12 Sep 2026" cards="full" />
        </div>
      );

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

            <span className="mt-3 grid h-11 place-items-center rounded-full bg-foreground text-[12px] font-semibold text-background">
              {t("cartGoToCheckout")} &#8594;
            </span>
            <p className="mt-2 text-center text-[10px] text-current/45">{t("cartTotalNoteExample")}</p>
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
            <span className="grid h-9 shrink-0 place-items-center rounded-full bg-foreground px-4 text-[11px] font-semibold text-background">
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

    case "cart:payments":
    case "checkout:payments":
      return (
        <div className="px-4 py-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-current/45">{t("paymentsHeading")}</p>
          <div className="flex flex-wrap gap-2">
            {["bKash", "Nagad", "Rocket", "Visa", "Mastercard", t("cashOnDelivery")].map((name) => (
              <span key={name} className="rounded-xs border border-current/15 px-2.5 py-1 text-[10px] text-current/60">
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

    case "product:description":
      return (
        <div className="px-4 py-4">
          <div className={variant === "box" ? "rounded-md border border-current/12 p-4" : ""}>
            <p className="mb-2 text-[14px] font-semibold">{t("descriptionHeading")}</p>
            {/* Real sentences. A merchant judging whether their own words have
                room here cannot do it against two grey bars. */}
            <p className="max-w-[62ch] text-[12px] leading-[1.7] text-current/65">{t("productDescriptionExample")}</p>
          </div>
        </div>
      );

    case "product:specs":
      return (
        <div className="px-4 py-4">
          {variant === "folded" ? (
            <div className="flex items-center justify-between rounded-md border border-current/12 px-3.5 py-3 text-[12px] font-medium text-current/70">
              <span>{t("specsHeading")}</span>
              <span aria-hidden>+</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {[
                [t("specMaterial"), "100% cotton"],
                [t("specFit"), "Regular"],
                [t("specCare"), "Machine wash cold"],
                [t("specMadeIn"), "Bangladesh"],
              ].map(([label, value]) => (
                <p key={label} className="flex justify-between gap-4 border-b border-current/10 py-2 text-[11.5px]">
                  <span className="text-current/45">{label}</span>
                  <span className="text-right text-current/75">{value}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      );

    case "product:breadcrumb":
      return (
        <p className="px-4 py-3 text-[11px] text-current/45">
          {t("breadcrumbHomeExample")} · Men · <span className="text-current/70">Gradient Graphic T-shirt</span>
        </p>
      );

    case "product:shipping":
      return variant === "plain" ? (
        <div className="px-4 py-4">
          <SectionHead title={t("shippingHeading")} />
          <div className="space-y-2 text-[11.5px] leading-relaxed text-current/60">
            <p>{t("shippingInside")}</p>
            <p>{t("shippingOutside")}</p>
            <p>{t("shippingReturns")}</p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between rounded-md border border-current/12 px-3.5 py-3 text-[12px] font-medium text-current/70">
            <span>{t("shippingHeading")}</span>
            <span aria-hidden>+</span>
          </div>
        </div>
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
            {[
              ["Nusrat J.", t("reviewOne")],
              ["Rafiq H.", t("reviewTwo")],
              ["Tanvir A.", t("reviewThree")],
            ].map(([name, words]) => (
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
            <span className="grid h-9 shrink-0 place-items-center rounded-full bg-foreground px-5 text-[11px] font-semibold text-background">
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
              {minimal ? null : field(MapPin, t("fieldAddress"), t("fieldAddressHint"))}
              {minimal
                ? field(Map, t("fieldArea"))
                : pair(field(Map, t("fieldDistrict")), field(Map, t("fieldArea")))}
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
      const banner =
        variant === "warning" ? (
          // The amber is in the edge and the fill, not the words: the canvas
          // takes the dashboard's own ground, and a fixed dark ink disappears
          // on the dark one.
          <p className="mb-3 rounded-xs border border-[#b4571f]/45 bg-[#b4571f]/12 px-3 py-2.5 text-[11px] leading-relaxed">
            {t("beforePayWarningExample")}
          </p>
        ) : variant === "note" ? (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-current/55">{t("beforePayNoteExample")}</p>
        ) : null;
      return (
        <div className="px-4 pb-4">
          {banner}
          {/* The same near-black the rest of the mock shop fills a button with.
              Not `bg-current`: the label sets `color`, so currentColor would
              paint the button in the label's colour and it would disappear. */}
          <span className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground text-[12px] font-semibold text-background">
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

    case "header:layout":
      return <ShopChrome page={page} slotKey="header" variant={variant} settings={settings} />;

    case "header:search":
      return variant === "off" ? (
        <p className="px-4 py-3 text-center text-[12px] text-current/55">{t("searchOffExample")}</p>
      ) : variant === "icon" ? (
        <div className="flex items-center justify-center gap-2 px-4 py-3 text-[12px] text-current/55">
          <span className="size-4 rounded-full border border-current/30" aria-hidden />
          {t("searchIconExample")}
        </div>
      ) : (
        <div className="px-4 py-3">
          <span className="flex h-9 items-center gap-2 rounded-xs border border-current/15 px-3 text-[12px] text-current/45">
            <span className="size-3.5 rounded-full border border-current/30" aria-hidden />
            {t("searchBoxExample")}
          </span>
        </div>
      );

    case "header:sticky":
      return (
        <p className="px-4 py-3 text-center text-[12px] text-current/55">
          {variant === "off" ? t("stickyOffExample") : t("stickyExample")}
        </p>
      );

    case "header:marks":
      return (
        <p className="px-4 py-3 text-center text-[12px] text-current/55">
          {variant === "on" ? t("marksBothExample") : t("marksCartOnly")}
        </p>
      );

    case "footer:layout":
      return <ShopChrome page={page} slotKey="footer" variant={variant} settings={settings} />;

    case "footer:contact":
      return (
        <div className="border-t border-border bg-muted px-5 py-5 text-current/65">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">Gadzilla</p>
          {variant === "email" ? (
            <p className="text-[11px]">hello@gadzilla.com</p>
          ) : (
            <>
              <p className="text-[11px] leading-relaxed">12 Gulshan Avenue, Dhaka 1212</p>
              <p className="mt-1.5 text-[11px]">+880 1700 000000 · hello@gadzilla.com</p>
            </>
          )}
        </div>
      );

    case "footer:social":
      return (
        <div className="border-t border-border bg-muted px-5 py-5 text-current/65">
          {variant === "names" ? (
            <p className="text-[11px]">Facebook · Instagram · YouTube · TikTok</p>
          ) : (
            <div className="flex gap-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="size-8 rounded-full bg-current/12" />
              ))}
            </div>
          )}
        </div>
      );

    case "footer:payments":
      return (
        <div className="border-t border-border bg-muted px-5 py-5">
          <p className="mb-2.5 text-[10px] uppercase tracking-[0.08em] text-current/45">{t("paymentsHeading")}</p>
          <div className="flex flex-wrap gap-2">
            {["bKash", "Nagad", "Rocket", "Visa", "Mastercard", t("cashOnDelivery")].map((name) => (
              <span
                key={name}
                className="rounded-xs border border-current/15 px-2.5 py-1 text-[10px] text-current/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      );

    case "footer:newsletter":
      return (
        <div className="border-t border-border bg-muted px-5 py-5 text-current/65">
          <p className="text-[12px] font-semibold text-foreground">
            {variant === "whatsapp" ? t("signupWhatsappHeading") : t("signupEmailHeading")}
          </p>
          <div className="mt-3 flex max-w-sm gap-2">
            <span className="h-9 flex-1 rounded-xs bg-current/12" />
            <span className="grid h-9 place-items-center rounded-xs bg-white px-4 text-[11px] text-[#1a1a1a]">
              {variant === "whatsapp" ? t("signupWhatsappButton") : t("signupEmailButton")}
            </span>
          </div>
        </div>
      );

    case "footer:bottom":
      return (
        <div className="border-t border-border bg-muted px-5 py-4 text-[10px] text-current/45">
          {variant === "policies" ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>© 2026 Gadzilla · powered by Paperbase</span>
              <span>Privacy · Returns · Terms</span>
            </div>
          ) : (
            <span>© 2026 Gadzilla — All rights reserved · powered by Paperbase</span>
          )}
        </div>
      );

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
