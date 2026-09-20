"use client";

import { useTranslations } from "next-intl";

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

function Cards({ items, ratio = "1" }: { items: { name: string; price: string }[]; ratio?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.name} className="min-w-0">
          <div className="rounded-xs bg-current/8" style={{ aspectRatio: ratio }} />
          <p className="mt-2 truncate text-[11px] text-current/60">{item.name}</p>
          <p className="text-[12px] font-semibold tabular-nums">{item.price}</p>
        </div>
      ))}
    </div>
  );
}

const FEATURED = [
  { name: "Denim Work Shirt", price: "৳65" },
  { name: "Oxford Shirt", price: "৳82" },
  { name: "Linen Overshirt", price: "৳94" },
  { name: "Corduroy Shirt", price: "৳71" },
];

const BESTSELLERS = [
  { name: "Crossbody Bag", price: "৳45" },
  { name: "Canvas Tote", price: "৳52" },
  { name: "Leather Belt", price: "৳29" },
  { name: "Card Wallet", price: "৳41" },
];

const POSTS = [
  { title: "How we choose leather", excerpt: "Six tanneries, one that answers the phone." },
  { title: "Caring for canvas in the rain", excerpt: "Dhaka in July is a test no lab can run." },
  { title: "Behind the seams", excerpt: "A day with the people who cut and stitch." },
  { title: "Why our hardware never changed", excerpt: "Six years, and nothing has worn out yet." },
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
  posts: { title: string; excerpt: string }[];
  cards: string;
  meta: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {posts.map((post) => (
        <div key={post.title} className="min-w-0">
          {cards === "words" ? null : <div className="aspect-[4/3] rounded-xs bg-current/8" aria-hidden />}
          <p className={`${cards === "words" ? "" : "mt-2"} text-[12px] font-medium leading-snug`}>{post.title}</p>
          {cards === "picture" ? null : (
            <p className="mt-1 text-[10.5px] leading-relaxed text-current/50">{post.excerpt}</p>
          )}
          {meta ? <p className="mt-1 text-[10px] text-current/40">{meta}</p> : null}
        </div>
      ))}
    </div>
  );
}

const ARRIVALS = [
  { name: "Merino Scarf", price: "৳58" },
  { name: "Wool Cap", price: "৳34" },
  { name: "Suede Loafer", price: "৳120" },
  { name: "Cotton Socks", price: "৳18" },
];

/** The mock shop, one slot at a time. `variant` is whatever the merchant chose. */
export function ShopChrome({
  page,
  slotKey,
  variant,
  settings,
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
}) {
  const t = useTranslations("themeEditor.slots");

  // The announcement and the masthead are drawn by key rather than by page:
  // both live in the header group, so every page shows them and only the Header
  // entry in the picker edits them.
  if (slotKey === "notice") {
    return (
      <p className="border-b border-border bg-muted px-4 py-2 text-center text-[11px] uppercase tracking-[0.06em] text-current/75">
        {t("noticeExample")}
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
    case "home:hero":
      return (
        <div className="grid h-[150px] place-items-center bg-current/6 px-4 text-center">
          <div>
            <p className="text-sm text-current/60">
              {variant === "video" ? t("heroVideo") : variant === "still" ? t("heroStill") : t("heroSliderExample")}
            </p>
            {variant === "slider" || variant === undefined ? (
              <div className="mt-2.5 flex justify-center gap-1.5">
                <span className="size-1.5 rounded-full bg-current/40" />
                <span className="size-1.5 rounded-full bg-current/20" />
              </div>
            ) : null}
          </div>
        </div>
      );

    case "home:categories":
      return variant === "strip" ? (
        <div className="flex gap-2 overflow-hidden px-4 py-4">
          {["Audio", "Men", "Women", "Wearables", "Kids", "Home"].map((name) => (
            <span key={name} className="shrink-0 rounded-full border border-current/15 px-3 py-1.5 text-[11px]">
              {name}
            </span>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4">
          <SectionHead title={t("categoriesHeading")} />
          <div className="grid grid-cols-4 gap-3">
            {["Audio", "Men", "Women", "Kids"].map((name) => (
              <div key={name} className="min-w-0">
                <div className="aspect-[4/3] rounded-xs bg-current/8" />
                <p className="mt-1.5 truncate text-center text-[11px] text-current/60">{name}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "home:trust":
      return variant === "line" ? (
        <p className="border-y border-current/10 px-4 py-3 text-center text-[11px] uppercase tracking-[0.06em] text-current/55">
          {t("trustExample")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 border-y border-current/10 px-4 py-4 sm:grid-cols-4">
          {[t("trustDelivery"), t("trustReturns"), t("trustPayment"), t("trustSupport")].map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span className="size-7 shrink-0 rounded-full bg-current/8" />
              <span className="min-w-0 truncate text-[11px] text-current/60">{label}</span>
            </div>
          ))}
        </div>
      );

    case "home:featured":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("featuredHeading")} link={t("browseAll")} />
          <Cards items={variant === "grid" ? [...FEATURED, ...BESTSELLERS] : FEATURED} />
        </div>
      );

    case "home:bands":
      return (
        <div className="px-4 py-4">
          <SectionHead title="Button-Downs" link={t("browseAll")} />
          <Cards items={FEATURED} />
          <div className="mt-5">
            <SectionHead title="Outerwear" link={t("browseAll")} />
            <Cards items={ARRIVALS} />
          </div>
        </div>
      );

    case "home:promo":
      return (
        <div className="px-4 py-4">
          {variant === "card" ? (
            <div className="flex items-center gap-4 rounded-xs bg-current/6 p-4">
              <span className="size-16 shrink-0 rounded-xs bg-current/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[13px] font-semibold">{t("promoCardHeading")}</p>
                <Line w="80%" />
                <span className="mt-1 inline-block rounded-xs bg-current/20 px-3 py-1.5 text-[10px]">
                  {t("browseAll")}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center text-[12px] uppercase tracking-[0.08em] text-current/60">
              {variant === "countdown" ? t("promoCountdownExample") : t("promoTextExample")}
            </p>
          )}
        </div>
      );

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
            {["Nusrat J.", "Rafiq H.", "Tanvir A."].map((name) => (
              <div key={name} className="rounded-xs border border-current/12 p-3">
                <p className="text-[11px] text-current/45">★★★★★</p>
                <div className="mt-2 space-y-1.5">
                  <Line />
                  <Line w="70%" />
                </div>
                <p className="mt-2.5 text-[11px] text-current/60">{name}</p>
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

    case "product:buy": {
      const pictures =
        variant === "column" ? (
          <div className="space-y-2">
            <div className="aspect-[4/5] rounded-xs bg-current/8" />
            <div className="aspect-[4/5] rounded-xs bg-current/8" />
          </div>
        ) : variant === "single" ? (
          <div className="aspect-square rounded-xs bg-current/8" />
        ) : (
          <div>
            <div className="aspect-square rounded-xs bg-current/8" />
            <div className="mt-2 flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="size-11 rounded-xs bg-current/8" />
              ))}
            </div>
          </div>
        );
      return (
        <div className="grid gap-5 px-4 py-4 sm:grid-cols-2">
          {pictures}
          <div>
            <h4 className="m-0 mb-1.5 text-lg font-semibold">Crossbody Bag</h4>
            <p className="mb-3 text-[19px] font-semibold tabular-nums">৳45</p>
            <p className="mb-2 text-[11px] uppercase tracking-[0.06em] text-current/45">{t("colour")}</p>
            <div className="mb-3 flex gap-2">
              <span className="size-7 rounded-xs bg-current/25" />
              <span className="size-7 rounded-xs bg-current/10" />
            </div>
            <span className="mb-2 block h-9 rounded-xs bg-foreground" />
            <span className="mb-3 block h-9 rounded-xs border border-current/15" />
            <p className="text-[11px] text-current/45">Accessories · Bags</p>
          </div>
        </div>
      );
    }

    case "product:trust":
    case "cart:trust":
    case "checkout:trust":
      return (
        <p className="border-t border-current/10 px-4 py-3 text-center text-[11px] uppercase tracking-[0.06em] text-current/55">
          {page === "product" ? t("trustExample") : t("trustLineExample")}
        </p>
      );

    case "category:breadcrumb":
      return (
        <p className="px-4 py-3 text-[11px] text-current/45">
          {t("breadcrumbHomeExample")} · Accessories · <span className="text-current/70">Bags</span>
        </p>
      );

    case "category:heading":
      if (variant === "banner") {
        return (
          <div className="relative grid h-[130px] place-items-center bg-current/10 px-4 text-center">
            <span>
              <span className="block text-[22px] font-medium tracking-tight">Bags</span>
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
          <h4 className="m-0 text-[22px] font-medium tracking-tight">Bags</h4>
          <p className="mt-1.5 max-w-[46ch] text-[11.5px] leading-relaxed text-current/55">
            {t("catDescriptionExample")}
          </p>
        </div>
      );

    case "category:count":
      return <p className="px-4 pb-1 text-[11px] text-current/45">{t("catCountExample", { count: 24 })}</p>;

    case "category:sort":
      return variant === "tabs" ? (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {[t("sortNewest"), t("sortPriceLow"), t("sortPriceHigh"), t("sortPopular")].map((name, i) => (
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
            {t("sortNewest")}
            <span className="text-current/40" aria-hidden>
              ▾
            </span>
          </span>
        </div>
      );

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

    case "category:text":
      return (
        <div className="px-4 py-5 text-center">
          <h4 className="m-0 mb-2 text-[14px] font-semibold">{t("catTextHeadingExample")}</h4>
          <p className="mx-auto max-w-[52ch] text-[11.5px] leading-relaxed text-current/55">
            {t("catTextBodyExample")}
          </p>
        </div>
      );

    case "category:empty":
      return (
        <div className="border-t border-dashed border-current/15 px-4 py-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.06em] text-current/40">{t("catEmptyWhen")}</p>
          {variant === "invite" ? (
            <div className="grid place-items-center gap-3 py-4 text-center">
              <span>
                <span className="block text-[14px] font-medium">{t("catEmptyHeadingExample")}</span>
                <span className="mt-1 block text-[11px] text-current/50">{t("catEmptyBodyExample")}</span>
              </span>
              <span className="grid h-9 place-items-center rounded-xs bg-foreground px-5 text-[11px] font-semibold text-background">
                {t("catEmptyButtonExample")}
              </span>
            </div>
          ) : (
            <p className="py-4 text-[12px] text-current/55">{t("catEmptyTextExample")}</p>
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
          <div className="grid gap-3 px-4 py-4">
            {BESTSELLERS.slice(0, 3).map((item) => (
              <div key={item.name} className="flex items-center gap-3 border-b border-current/10 pb-3">
                <span className="size-14 shrink-0 rounded-xs bg-current/8" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{item.name}</span>
                  <span className="block text-[12px] font-semibold tabular-nums">{item.price}</span>
                </span>
                {buy ? (
                  <span className="grid h-8 shrink-0 place-items-center rounded-xs bg-foreground px-3 text-[11px] text-background">
                    {t("addToCart")}
                  </span>
                ) : null}
                <span className="shrink-0 text-[13px] text-current/35" aria-hidden>
                  ×
                </span>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BESTSELLERS.map((item) => (
              <div key={item.name} className="min-w-0">
                <span className="relative block aspect-square rounded-xs bg-current/8" aria-hidden>
                  <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[color:var(--color-background)] text-[11px] text-current/45">
                    ×
                  </span>
                </span>
                <p className="mt-2 truncate text-[11px] text-current/60">{item.name}</p>
                <p className="text-[12px] font-semibold tabular-nums">{item.price}</p>
                {buy ? (
                  <span className="mt-1.5 grid h-8 place-items-center rounded-xs bg-foreground text-[11px] text-background">
                    {t("addToCart")}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // The choice is read by the list above, so this band shows what it changes.
    case "wishlist:action":
      return (
        <div className="px-4 py-4">
          <p className="mb-2.5 text-[10px] uppercase tracking-[0.08em] text-current/45">{t("wishActionWhat")}</p>
          <div className="flex items-center gap-3 rounded-xs border border-current/12 p-3">
            <span className="size-12 shrink-0 rounded-xs bg-current/8" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">Crossbody Bag</span>
              <span className="block text-[12px] font-semibold tabular-nums">৳45</span>
            </span>
            {variant === "cart" ? (
              <span className="grid h-8 shrink-0 place-items-center rounded-xs bg-foreground px-3 text-[11px] text-background">
                {t("addToCart")}
              </span>
            ) : (
              <span className="shrink-0 text-[11px] text-current/45">{t("wishActionLookExample")}</span>
            )}
          </div>
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
          <div className="mx-auto max-w-[22rem] rounded-xs border border-current/12 p-4">
            <p className="mb-1 text-[14px] font-medium">
              {lookup ? t("accountLookupHeading") : t("accountSignInHeading")}
            </p>
            <p className="mb-3 text-[11px] leading-relaxed text-current/50">
              {lookup ? t("accountLookupBody") : t("accountSignInBody")}
            </p>
            <div className="grid gap-2">
              <span className="block h-8 rounded-xs border border-current/15 bg-current/[0.04]" aria-hidden />
              {lookup ? <span className="block h-8 rounded-xs border border-current/15 bg-current/[0.04]" aria-hidden /> : null}
              <span className="grid h-9 place-items-center rounded-xs bg-foreground text-[11px] font-semibold text-background">
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
      const orders = [
        { id: "#1042", date: "12 Sep 2026", state: t("orderDelivered"), total: "৳163" },
        { id: "#1038", date: "2 Sep 2026", state: t("orderOnTheWay"), total: "৳92" },
      ];
      if (variant === "cards") {
        return (
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xs border border-current/12 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold tabular-nums">{order.id}</span>
                  <span className="text-[13px] font-semibold tabular-nums">{order.total}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-current/45">{order.date}</p>
                <span className="mt-2 inline-block rounded-full border border-current/15 px-2.5 py-0.5 text-[10px] text-current/60">
                  {order.state}
                </span>
                <div className="mt-2.5 flex gap-2">
                  {[0, 1].map((i) => (
                    <span key={i} className="size-9 rounded-xs bg-current/8" aria-hidden />
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
            <div key={order.id} className="flex items-center gap-3 border-b border-current/10 py-3">
              <span className="w-14 shrink-0 text-[12px] font-semibold tabular-nums">{order.id}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-current/45">{order.date}</span>
              <span className="shrink-0 rounded-full border border-current/15 px-2.5 py-0.5 text-[10px] text-current/60">
                {order.state}
              </span>
              <span className="w-14 shrink-0 text-right text-[12px] font-semibold tabular-nums">{order.total}</span>
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
          <span className="h-8 flex-1 rounded-xs border border-current/15 bg-current/[0.04]" aria-hidden />
          <span className="grid h-8 shrink-0 place-items-center rounded-xs border border-current/25 px-3 text-[11px] font-medium">
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
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="aspect-[16/10] rounded-xs bg-current/8" aria-hidden />
              <div className="flex flex-col justify-center gap-2">
                <p className="text-[16px] font-medium leading-snug">{POSTS[0].title}</p>
                <p className="text-[11.5px] leading-relaxed text-current/55">{POSTS[0].excerpt}</p>
                {cardMeta ? <p className="text-[10px] text-current/40">{cardMeta}</p> : null}
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
                <div key={post.title} className="flex items-center gap-3 border-b border-current/10 pb-3">
                  <span className="h-14 w-20 shrink-0 rounded-xs bg-current/8" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{post.title}</span>
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
            <h4 className="m-0 px-4 pt-4 text-[21px] font-medium leading-tight tracking-tight">{POSTS[0].title}</h4>
          </div>
        );
      }
      return (
        <h4 className="m-0 px-4 pt-5 text-[21px] font-medium leading-tight tracking-tight">{POSTS[0].title}</h4>
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
        <div className={wide ? "px-4 py-4" : "mx-auto max-w-[34rem] px-4 py-4"}>
          <p className="mb-3 text-[12px] leading-[1.75] text-current/70">{t("articleBodyExample")}</p>
          <div className="grid gap-2">
            <Line />
            <Line />
            <Line w="92%" />
            <Line w="78%" />
          </div>
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
        <div className="grid gap-3 border-t border-current/10 px-4 py-4 sm:grid-cols-2">
          {[
            { dir: t("articlePrev"), title: POSTS[1].title, align: "" },
            { dir: t("articleNext"), title: POSTS[2].title, align: "sm:text-right" },
          ].map((item) => (
            <div key={item.dir} className={item.align}>
              <p className="text-[10px] uppercase tracking-[0.08em] text-current/40">{item.dir}</p>
              <p className="mt-1 truncate text-[12px] font-medium">{item.title}</p>
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
          <div className={variant === "box" ? "rounded-xs border border-current/12 p-4" : ""}>
            <p className="mb-2.5 text-[11px] uppercase tracking-[0.06em] text-current/45">{t("descriptionHeading")}</p>
            <div className="space-y-2">
              <Line />
              <Line w="65%" />
            </div>
          </div>
        </div>
      );

    case "product:specs":
      return (
        <div className="px-4 py-4">
          {variant === "folded" ? (
            <div className="flex items-center justify-between border-y border-current/12 py-3.5 text-[11px] uppercase tracking-[0.06em] text-current/55">
              <span>{t("specsHeading")}</span>
              <span aria-hidden>+</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-1 text-[11px] text-current/60 sm:grid-cols-2">
              <p className="border-b border-current/10 py-1.5">Material · Cotton canvas</p>
              <p className="border-b border-current/10 py-1.5">Strap · Adjustable</p>
              <p className="border-b border-current/10 py-1.5">Closure · Zip</p>
              <p className="border-b border-current/10 py-1.5">Made in · Bangladesh</p>
            </div>
          )}
        </div>
      );

    case "product:breadcrumb":
      return (
        <p className="px-4 py-2.5 text-[11px] text-current/45">Accessories · Bags · Crossbody Bag</p>
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
          <div className="flex items-center justify-between border-y border-current/12 py-3.5 text-[11px] uppercase tracking-[0.06em] text-current/55">
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
            {["Nusrat J.", "Rafiq H.", "Tanvir A."].map((name) => (
              <div key={name} className="rounded-xs border border-current/12 p-3">
                <p className="text-[11px] text-current/45">★★★★★</p>
                <div className="mt-2 space-y-1.5">
                  <Line />
                  <Line w="70%" />
                </div>
                <p className="mt-2.5 text-[11px] text-current/60">{name}</p>
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
          <div className="flex items-center gap-3 rounded-xs border border-current/15 bg-current/5 px-3 py-2.5">
            <span className="size-9 shrink-0 rounded-xs bg-current/10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium">Crossbody Bag</span>
              <span className="block text-[12px] font-semibold tabular-nums">৳45</span>
            </span>
            <span className="grid h-9 shrink-0 place-items-center rounded-xs bg-foreground px-4 text-[11px] text-background">
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
     * The two variants are the real ones -- `customer_form_variant` on the
     * shop's checkout settings -- so the preview lists the actual fields rather
     * than a count. Extended asks for the address; minimal asks for a name, a
     * number and an area, and somebody rings back for the rest. Delivery and
     * payment are under them because that is where the page puts them, and both
     * come from the shop's own settings rather than from here.
     */
    case "checkout:form": {
      const minimal = variant === "minimal";
      const field = (label: string, w = "100%") => (
        <label key={label} className="grid min-w-0 gap-1" style={{ width: w }}>
          <span className="text-[10px] text-current/50">{label}</span>
          <span className="block h-8 rounded-xs border border-current/15 bg-current/[0.04]" />
        </label>
      );
      return (
        <div className="grid gap-4 px-4 py-4">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em]">{t("customerInfo")}</p>
            <div className="grid gap-2.5">
              {minimal ? (
                field(t("fieldFullName"))
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {field(t("fieldFirstName"))}
                  {field(t("fieldLastName"))}
                </div>
              )}
              {minimal ? null : field(t("fieldEmail"))}
              {field(t("fieldPhone"))}
              {minimal ? null : field(t("fieldDistrict"))}
              {field(t("fieldArea"))}
              {minimal ? null : field(t("fieldAddress"))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em]">{t("deliveryHeading")}</p>
            <div className="flex items-center justify-between rounded-xs border border-current/15 px-2.5 py-2 text-[11px]">
              <span className="flex items-center gap-2 text-current/60">
                <span className="size-2.5 rounded-full border-[3px] border-current/45" aria-hidden />
                {t("deliveryInside")}
              </span>
              <span className="tabular-nums text-current/60">৳60</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em]">{t("paymentHeading")}</p>
            <div className="flex items-center gap-2 rounded-xs border border-current/15 px-2.5 py-2 text-[11px] text-current/60">
              <span className="size-2.5 rounded-full border-[3px] border-current/45" aria-hidden />
              {t("cashOnDelivery")}
            </div>
          </div>

        </div>
      );
    }

    /**
     * On the cart this is the CONTROL, not the thing.
     *
     * The promo row belongs inside the summary panel and is drawn there, so
     * putting a second copy in a band of its own would show a merchant two of
     * something their shoppers see once. This strip says where the choice lands
     * and what it will look like when it does -- the same job the blog's card
     * and meta bands do for the shelves above them.
     */
    case "cart:coupon":
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
     * The coupon box, under the order it would come off.
     *
     * `link` is not a smaller version of `open`: an empty coupon field is a
     * known way to lose a sale, because a shopper who has no code goes looking
     * for one and does not always come back. A line they can ignore costs the
     * shop nothing.
     */
    case "checkout:coupon":
      return (
        <div className="mx-4 mb-4 rounded-md border border-current/12 p-4">
          {variant === "link" ? (
            <p className="text-[11px] underline underline-offset-2 text-current/55">{t("couponLinkExample")}</p>
          ) : (
            <div className="flex gap-2">
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
          <span className="block rounded-xs bg-foreground py-2.5 text-center text-[12px] font-semibold text-background">
            {t("placeOrder")}
          </span>
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

    default:
      return (
        <div className="space-y-2 px-4 py-4">
          <Line />
          <Line w="60%" />
        </div>
      );
  }
}
