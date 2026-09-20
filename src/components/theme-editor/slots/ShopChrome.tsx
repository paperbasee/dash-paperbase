"use client";

import { useTranslations } from "next-intl";

import type { SlotPageKey } from "@/lib/theme-editor/slot-catalogue";

/**
 * What a slot actually shows, drawn as the shop rather than as a grey box.
 *
 * The canvas IS the editor now -- there is no list beside it -- so a merchant
 * has to recognise the thing they are about to click. A row of wireframe bars
 * would not be recognisable; a masthead with the shop's name in it is. These are
 * deliberately shallow: enough to read at a glance, and no attempt at the real
 * storefront, which is what the live preview will show once this is wired.
 *
 * Everything here is scenery. It carries no state and no behaviour: the slot
 * wrapper in `SlotCanvas` owns the clicking.
 */

function Bars({ count = 3, tall = false }: { count?: number; tall?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={tall ? "block flex-1 rounded-xs bg-current/10" : "block h-1.5 flex-1 rounded-full bg-current/10"}
          style={tall ? { height: 46 } : undefined}
        />
      ))}
    </div>
  );
}

function Cards({ items }: { items: { name: string; price: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.name} className="min-w-0">
          <div className="aspect-square rounded-xs bg-current/8" />
          <p className="mt-1.5 truncate text-[10px] text-current/55">{item.name}</p>
          <p className="text-[11px] font-semibold tabular-nums">{item.price}</p>
        </div>
      ))}
    </div>
  );
}

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

  if (slotKey === "header") {
    return (
      <div>
        <div className="flex items-center gap-2.5 bg-[#1a1a1a] px-3.5 py-2.5 text-white">
          <span className="text-[13px] font-semibold tracking-[0.14em]">GADZILLA</span>
          {variant !== "masthead" ? <span className="h-5 flex-1 rounded-xs bg-white/12" /> : <span className="flex-1" />}
          <span className="size-3.5 rounded-xs bg-white/25" />
          <span className="size-3.5 rounded-xs bg-white/25" />
        </div>
        <div className="flex gap-3.5 overflow-hidden border-b border-current/10 px-3.5 py-1.5 text-[9px] uppercase tracking-[0.08em] text-current/45">
          <span>Audio</span>
          <span>Men</span>
          <span>Wearables</span>
          <span>Women</span>
          <span>Kids</span>
        </div>
      </div>
    );
  }

  if (slotKey === "footer") {
    return (
      <div className="grid grid-cols-2 gap-2.5 bg-[#1a1a1a] px-3.5 py-3.5 text-[9px] text-white/60 sm:grid-cols-4">
        {["Gadzilla", "Information", "Service", "Company"].map((heading) => (
          <div key={heading}>
            <p className="mb-1.5 text-[9px] uppercase tracking-[0.06em] text-white">{heading}</p>
            <span className="mb-1 block h-1 w-4/5 rounded-full bg-white/18" />
            <span className="block h-1 w-3/5 rounded-full bg-white/18" />
          </div>
        ))}
      </div>
    );
  }

  switch (`${page}:${slotKey}`) {
    case "home:notice":
      return (
        <p className="px-3.5 py-1.5 text-center text-[10px] uppercase tracking-[0.06em] text-current/55">
          {t("noticeExample")}
        </p>
      );

    case "home:hero":
      return (
        <div className="grid h-[130px] place-items-center bg-current/6 px-3 text-center">
          <div>
            <p className="text-[13px] text-current/55">
              {variant === "video" ? t("heroVideo") : variant === "still" ? t("heroStill") : t("heroSliderExample")}
            </p>
            {variant === "slider" || variant === undefined ? (
              <div className="mt-2 flex justify-center gap-1">
                <span className="size-1.5 rounded-full bg-current/35" />
                <span className="size-1.5 rounded-full bg-current/20" />
              </div>
            ) : null}
          </div>
        </div>
      );

    case "home:bands":
      return (
        <div className="p-3.5">
          <div className="mb-2.5 flex items-baseline justify-between gap-2.5">
            <h4 className="m-0 text-sm font-semibold">Button-Downs</h4>
            <span className="text-[9px] uppercase tracking-[0.08em] text-current/45">Browse everything</span>
          </div>
          <Cards
            items={[
              { name: "Denim Work Shirt", price: "৳65" },
              { name: "Oxford Shirt", price: "৳82" },
              { name: "Linen Overshirt", price: "৳94" },
              { name: "Corduroy Shirt", price: "৳71" },
            ]}
          />
        </div>
      );

    case "home:promo":
      return (
        <div className="px-3.5 py-3">
          {variant === "card" ? (
            <div className="flex items-center gap-3 rounded-xs bg-current/6 p-3">
              <span className="size-12 shrink-0 rounded-xs bg-current/10" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">{t("promoCard")}</p>
                <Bars count={2} />
              </div>
            </div>
          ) : (
            <p className="text-center text-[11px] uppercase tracking-[0.08em] text-current/55">
              {variant === "countdown" ? t("promoCountdownExample") : t("promoTextExample")}
            </p>
          )}
        </div>
      );

    case "home:story":
      return (
        <div className={variant === "both" ? "flex items-center gap-3 p-3.5" : "p-3.5"}>
          {variant === "both" ? <span className="h-16 w-1/3 shrink-0 rounded-xs bg-current/8" /> : null}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bars count={1} />
            <Bars count={1} />
            <div className="w-1/2">
              <Bars count={1} />
            </div>
          </div>
        </div>
      );

    case "product:buy":
      return (
        <div className="grid gap-3.5 p-3.5 sm:grid-cols-2">
          <div className="aspect-[4/5] rounded-xs bg-current/8" />
          <div>
            <h4 className="m-0 mb-1 text-base font-semibold">Crossbody Bag</h4>
            <p className="mb-2.5 text-[17px] font-semibold tabular-nums">৳45</p>
            <span className="mb-1.5 block h-7 rounded-xs bg-[#1a1a1a]" />
            <span className="mb-2.5 block h-7 rounded-xs border border-current/15" />
            <p className="text-[10px] text-current/45">Accessories · Bags</p>
          </div>
        </div>
      );

    case "product:trust":
    case "checkout:trust":
      return (
        <p className="border-t border-current/10 px-3.5 py-2.5 text-center text-[10px] uppercase tracking-[0.06em] text-current/50">
          {page === "checkout" ? t("trustLineExample") : t("trustExample")}
        </p>
      );

    case "product:description":
      return (
        <div className="p-3.5">
          <div className={variant === "box" ? "rounded-xs border border-current/12 p-3" : ""}>
            <p className="mb-2 text-[11px] uppercase tracking-[0.06em] text-current/45">{t("descriptionHeading")}</p>
            <div className="space-y-1.5">
              <Bars count={1} />
              <div className="w-3/5">
                <Bars count={1} />
              </div>
            </div>
          </div>
        </div>
      );

    case "product:specs":
      return (
        <div className="p-3.5">
          {variant === "folded" ? (
            <div className="flex items-center justify-between border-y border-current/12 py-2.5 text-[11px] uppercase tracking-[0.06em] text-current/50">
              <span>{t("specsHeading")}</span>
              <span aria-hidden>+</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-[10px] text-current/55 sm:grid-cols-2">
              <p className="border-b border-current/10 py-1">Material · Cotton canvas</p>
              <p className="border-b border-current/10 py-1">Strap · Adjustable</p>
              <p className="border-b border-current/10 py-1">Closure · Zip</p>
              <p className="border-b border-current/10 py-1">Made in · Bangladesh</p>
            </div>
          )}
        </div>
      );

    case "product:related":
      return (
        <div className="p-3.5">
          <h4 className="m-0 mb-2.5 text-sm font-semibold">{t("relatedHeading")}</h4>
          <Cards
            items={[
              { name: "Tote Bag", price: "৳52" },
              { name: "Sling Bag", price: "৳38" },
              { name: "Leather Belt", price: "৳29" },
              { name: "Card Wallet", price: "৳41" },
            ]}
          />
        </div>
      );

    case "checkout:form":
      return (
        <div className="grid gap-2 p-3.5">
          <span className="block h-6 rounded-xs bg-current/8" />
          <span className="block h-6 rounded-xs bg-current/8" />
          <span className="block h-6 w-3/5 rounded-xs bg-current/8" />
          <span className="block h-6 rounded-xs bg-current/8" />
        </div>
      );

    case "checkout:summary":
      return (
        <div className="grid gap-1.5 border-t border-current/10 p-3.5 text-[11px] text-current/55">
          <div className="flex justify-between tabular-nums">
            <span>Crossbody Bag × 1</span>
            <span>৳45</span>
          </div>
          <div className="flex justify-between tabular-nums">
            <span>{t("delivery")}</span>
            <span>৳60</span>
          </div>
          <div className="flex justify-between border-t border-current/10 pt-1.5 text-[13px] font-semibold tabular-nums text-current">
            <span>{t("total")}</span>
            <span>৳105</span>
          </div>
        </div>
      );

    case "checkout:after":
      return (
        <p className="px-3.5 py-2.5 text-center text-[10px] text-current/50">{t("afterExample")}</p>
      );

    case "header:layout":
      return <ShopChrome page={page} slotKey="header" variant={variant} />;

    case "header:sticky":
      return (
        <p className="px-3.5 py-2.5 text-center text-[11px] text-current/50">
          {variant === "off" ? t("stickyOffExample") : t("stickyExample")}
        </p>
      );

    case "header:marks":
      return (
        <p className="px-3.5 py-2.5 text-center text-[11px] text-current/50">
          {variant === "on" ? t("marksBothExample") : t("marksCartOnly")}
        </p>
      );

    case "footer:layout":
      return <ShopChrome page={page} slotKey="footer" variant={variant} />;

    default:
      return <Bars />;
  }
}
