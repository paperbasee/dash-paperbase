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
}: {
  page: SlotPageKey;
  slotKey: string;
  variant: string | undefined;
}) {
  const t = useTranslations("themeEditor.slots");

  // The announcement and the masthead are drawn by key rather than by page:
  // both live in the header group, so every page shows them and only the Header
  // entry in the picker edits them.
  if (slotKey === "notice") {
    return (
      <p className="bg-[#1a1a1a] px-4 py-2 text-center text-[11px] uppercase tracking-[0.06em] text-white/75">
        {t("noticeExample")}
      </p>
    );
  }

  if (slotKey === "header") {
    const layout = variant ?? "bar";
    const logo = <span className="text-sm font-semibold tracking-[0.14em]">GADZILLA</span>;
    const icons = (
      <span className="flex shrink-0 items-center gap-2.5">
        <span className="size-4 rounded-xs bg-white/25" />
        <span className="size-4 rounded-xs bg-white/25" />
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
      <div className="flex items-center gap-3 bg-[#1a1a1a] px-4 py-3 text-white">{children}</div>
    );

    if (layout === "masthead") {
      return (
        <div>
          <div className="bg-[#1a1a1a] px-4 py-5 text-center text-white">{logo}</div>
          <div className="border-b border-current/10">{nav(true)}</div>
        </div>
      );
    }
    if (layout === "split") {
      return (
        <div className="border-b border-current/10">
          {bar(
            <>
              <span className="flex flex-1 gap-3 overflow-hidden text-[10px] uppercase tracking-[0.08em] text-white/65">
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
              <span className="flex flex-1 gap-3.5 overflow-hidden text-[10px] uppercase tracking-[0.08em] text-white/65">
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
                <span className="block h-px bg-white/60" />
                <span className="block h-px bg-white/60" />
                <span className="block h-px bg-white/60" />
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
            <span className="h-7 flex-1 rounded-xs bg-white/12" />
            {icons}
          </>,
        )}
        <div className="border-b border-current/10">{nav(false)}</div>
      </div>
    );
  }

  if (slotKey === "footer") {
    const layout = variant ?? "columns";
    const heading = (text: string) => (
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">{text}</p>
    );
    const links = (items: string[]) =>
      items.map((link) => (
        <p key={link} className="mb-1.5 text-[11px] leading-relaxed">
          {link}
        </p>
      ));
    const shop = (
      <div>
        {heading("Gadzilla")}
        <p className="text-[11px] leading-relaxed">12 Gulshan Avenue, Dhaka 1212</p>
        <p className="mt-1.5 text-[11px]">+880 1700 000000</p>
      </div>
    );
    const columns = [
      { head: "Information", items: ["About us", "Blog", "Privacy policy"] },
      { head: "Customer service", items: ["Contact us", "Returns", "Track order"] },
      { head: "Company", items: ["Careers", "Wholesale", "Stores"] },
    ];
    const bottom = (
      <p className="mt-5 border-t border-white/12 pt-4 text-[10px] text-white/45">
        © 2026 Gadzilla — All rights reserved · powered by Paperbase
      </p>
    );

    if (layout === "minimal") {
      return (
        <div className="bg-[#1a1a1a] px-5 py-5 text-center text-white/65">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white">Gadzilla</p>
          <p className="mt-2.5 text-[11px]">About · Contact · Returns · Privacy</p>
          <p className="mt-3 text-[10px] text-white/45">© 2026 Gadzilla · powered by Paperbase</p>
        </div>
      );
    }
    if (layout === "centred") {
      return (
        <div className="bg-[#1a1a1a] px-5 py-6 text-center text-white/65">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">Gadzilla</p>
          <p className="mt-2.5 text-[11px]">12 Gulshan Avenue, Dhaka 1212 · +880 1700 000000</p>
          <p className="mt-3 text-[11px]">About us · Blog · Contact us · Returns · Privacy policy</p>
          {bottom}
        </div>
      );
    }
    if (layout === "split") {
      return (
        <div className="bg-[#1a1a1a] px-5 py-6 text-white/65">
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
          </div>
          {bottom}
        </div>
      );
    }
    return (
      <div className="bg-[#1a1a1a] px-5 py-6 text-white/65">
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
          {shop}
          {columns.map((column) => (
            <div key={column.head}>
              {heading(column.head)}
              {links(column.items)}
            </div>
          ))}
        </div>
        {bottom}
      </div>
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

    case "home:story":
      return (
        <div className={variant === "both" ? "flex items-center gap-5 px-4 py-6" : "px-4 py-6"}>
          {variant === "both" ? <span className="h-24 w-1/3 shrink-0 rounded-xs bg-current/8" /> : null}
          <div className="min-w-0 flex-1">
            <h4 className="m-0 mb-2.5 text-[15px] font-semibold">{t("storyHeading")}</h4>
            <div className="space-y-2">
              <Line />
              <Line />
              <Line w="60%" />
            </div>
          </div>
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
            <span className="grid h-9 place-items-center rounded-xs bg-[#1a1a1a] px-4 text-[11px] text-white">
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

    case "product:buy":
      return (
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <div className="aspect-[4/5] rounded-xs bg-current/8" />
          <div>
            <h4 className="m-0 mb-1.5 text-lg font-semibold">Crossbody Bag</h4>
            <p className="mb-3 text-[19px] font-semibold tabular-nums">৳45</p>
            <span className="mb-2 block h-9 rounded-xs bg-[#1a1a1a]" />
            <span className="mb-3 block h-9 rounded-xs border border-current/15" />
            <p className="text-[11px] text-current/45">Accessories · Bags</p>
          </div>
        </div>
      );

    case "product:trust":
    case "checkout:trust":
      return (
        <p className="border-t border-current/10 px-4 py-3 text-center text-[11px] uppercase tracking-[0.06em] text-current/55">
          {page === "checkout" ? t("trustLineExample") : t("trustExample")}
        </p>
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

    case "product:related":
      return (
        <div className="px-4 py-4">
          <SectionHead title={t("relatedHeading")} />
          <Cards items={BESTSELLERS} />
        </div>
      );

    case "checkout:form":
      return (
        <div className="grid gap-2.5 px-4 py-4">
          <span className="block h-9 rounded-xs bg-current/8" />
          <span className="block h-9 rounded-xs bg-current/8" />
          <span className="block h-9 w-3/5 rounded-xs bg-current/8" />
          <span className="block h-9 rounded-xs bg-current/8" />
        </div>
      );

    case "checkout:summary":
      return (
        <div className="grid gap-2 border-t border-current/10 px-4 py-4 text-[12px] text-current/60">
          <div className="flex justify-between tabular-nums">
            <span>Crossbody Bag × 1</span>
            <span>৳45</span>
          </div>
          <div className="flex justify-between tabular-nums">
            <span>{t("delivery")}</span>
            <span>৳60</span>
          </div>
          <div className="flex justify-between border-t border-current/10 pt-2 text-[14px] font-semibold tabular-nums text-current">
            <span>{t("total")}</span>
            <span>৳105</span>
          </div>
        </div>
      );

    case "checkout:after":
      return <p className="px-4 py-3 text-center text-[11px] text-current/55">{t("afterExample")}</p>;

    case "header:layout":
      return <ShopChrome page={page} slotKey="header" variant={variant} />;

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
      return <ShopChrome page={page} slotKey="footer" variant={variant} />;

    case "footer:contact":
      return (
        <div className="bg-[#1a1a1a] px-5 py-5 text-white/65">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">Gadzilla</p>
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
        <div className="bg-[#1a1a1a] px-5 py-5 text-white/65">
          {variant === "names" ? (
            <p className="text-[11px]">Facebook · Instagram · YouTube · TikTok</p>
          ) : (
            <div className="flex gap-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="size-8 rounded-full bg-white/12" />
              ))}
            </div>
          )}
        </div>
      );

    case "footer:payments":
      return (
        <div className="bg-[#1a1a1a] px-5 py-5">
          <p className="mb-2.5 text-[10px] uppercase tracking-[0.08em] text-white/45">{t("paymentsHeading")}</p>
          <div className="flex flex-wrap gap-2">
            {["bKash", "Nagad", "Rocket", "Visa", "Mastercard", t("cashOnDelivery")].map((name) => (
              <span
                key={name}
                className="rounded-xs border border-white/15 px-2.5 py-1 text-[10px] text-white/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      );

    case "footer:newsletter":
      return (
        <div className="bg-[#1a1a1a] px-5 py-5 text-white/65">
          <p className="text-[12px] font-semibold text-white">
            {variant === "whatsapp" ? t("signupWhatsappHeading") : t("signupEmailHeading")}
          </p>
          <div className="mt-3 flex max-w-sm gap-2">
            <span className="h-9 flex-1 rounded-xs bg-white/12" />
            <span className="grid h-9 place-items-center rounded-xs bg-white px-4 text-[11px] text-[#1a1a1a]">
              {variant === "whatsapp" ? t("signupWhatsappButton") : t("signupEmailButton")}
            </span>
          </div>
        </div>
      );

    case "footer:bottom":
      return (
        <div className="bg-[#1a1a1a] px-5 py-4 text-[10px] text-white/45">
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
