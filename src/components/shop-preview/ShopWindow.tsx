import { Heart, Lock, Search, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { SocialMark } from "@/components/SocialMark";
import type { PaletteTokens } from "@/lib/theme-editor/palettes";
import { cn } from "@/lib/utils";

import { SAMPLE_PRICES, formatTaka, heroPhoto, productPhoto, type ShopKind } from "./samples";

/** The width the window is drawn at; `ScaleToFit` shrinks it to where it sits.  */
export const SHOP_WINDOW_WIDTH = 560;

/**
 * The look of the window when no palette is given: the sign-in picture, and setup before the
 * palettes have loaded. Quiet white and ink, the dashboard's own -- not one of the shop palettes,
 * whose colours are the API's (`theming/presets/`).
 */
const PLAIN_LOOK: PaletteTokens = {
  background: "#ffffff",
  foreground: "#0f172a",
  muted: "#f3f2ef",
  border: "#e7e5e0",
  primary: "#0f172a",
  primary_foreground: "#ffffff",
  header: "#ffffff",
  header_foreground: "#0f172a",
};

function lookVars(tokens: PaletteTokens | null | undefined): CSSProperties {
  const look = { ...PLAIN_LOOK, ...(tokens ?? {}) };
  return {
    "--sw-bg": look.background,
    "--sw-fg": look.foreground,
    "--sw-muted": look.muted,
    "--sw-border": look.border,
    "--sw-brand": look.primary,
    "--sw-brand-fg": look.primary_foreground,
    "--sw-header": look.header,
    "--sw-header-fg": look.header_foreground,
  } as CSSProperties;
}

/**
 * A shop in a browser window: the owner's name, address and colours on the sample shop of the
 * kind they picked (samples.ts). Colours change by transition, so a new palette washes over it.
 */
export function ShopWindow({
  name,
  hostname,
  kind,
  tokens,
  announcement,
  whatsapp = false,
  hostnameFlashKey,
  className,
}: {
  name: string;
  hostname: string;
  kind: ShopKind;
  tokens?: PaletteTokens | null;
  announcement: string;
  whatsapp?: boolean;
  /** Changing it flashes the address bar green: a new address was just given. */
  hostnameFlashKey?: string | number;
  className?: string;
}) {
  const t = useTranslations("shopPreview");
  const locale = useLocale();
  const prices = SAMPLE_PRICES[kind];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-card bg-white text-left shadow-[0_1px_0_rgb(15_23_42/0.04),0_30px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-black/[0.06]",
        className
      )}
      style={{ width: SHOP_WINDOW_WIDTH }}
    >
      <div className="flex h-[34px] items-center gap-2.5 border-b border-black/[0.05] bg-[#fafafa] px-3">
        <span className="flex gap-[5px]" aria-hidden>
          <i className="size-[9px] rounded-full bg-[#e5e7eb]" />
          <i className="size-[9px] rounded-full bg-[#e5e7eb]" />
          <i className="size-[9px] rounded-full bg-[#e5e7eb]" />
        </span>
        <span
          key={hostnameFlashKey}
          className={cn(
            "mx-auto flex h-[22px] max-w-[300px] flex-1 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-xs bg-[#f1f3f5] px-2 text-[11px] text-[#475569]",
            hostnameFlashKey !== undefined && "pb-flash"
          )}
        >
          <Lock className="size-3 shrink-0 text-[#15803d]" aria-hidden />
          <span className="truncate">{hostname}</span>
        </span>
        <span className="w-[37px]" aria-hidden />
      </div>

      <div
        className="relative bg-[var(--sw-bg)] text-[var(--sw-fg)] transition-colors duration-500"
        style={lookVars(tokens)}
      >
        <div className="bg-[var(--sw-brand)] px-3 py-[5px] text-center text-[10px] tracking-[0.01em] text-[var(--sw-brand-fg)] transition-colors duration-500">
          {announcement}
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--sw-border)] bg-[var(--sw-header)] px-3.5 py-2.5 text-[var(--sw-header-fg)] transition-colors duration-500">
          <span className="max-w-[40%] truncate text-[13px] font-bold uppercase tracking-[0.08em]">
            {name}
          </span>
          <span className="flex gap-3 text-[10px] opacity-75">
            <span>{t(`kinds.${kind}.nav1`)}</span>
            <span>{t(`kinds.${kind}.nav2`)}</span>
            <span>{t(`kinds.${kind}.nav3`)}</span>
          </span>
          <span className="flex gap-2" aria-hidden>
            <Search className="size-[13px]" />
            <Heart className="size-[13px]" />
            <ShoppingBag className="size-[13px]" />
          </span>
        </div>

        <div className="relative mx-3 mt-2.5 h-[150px] overflow-hidden rounded-xs bg-[var(--sw-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized sample photo */}
          <img
            key={kind}
            src={heroPhoto(kind)}
            alt=""
            className="pb-drift size-full object-cover"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-black/55" />
          <div key={`${kind}-words`} className="pb-rise absolute inset-x-3.5 bottom-3.5 text-white">
            <p className="text-[9px] uppercase tracking-[0.14em] opacity-85">{t(`kinds.${kind}.kicker`)}</p>
            <p className="mb-2 mt-0.5 text-[19px] font-semibold leading-tight tracking-[-0.02em]">
              {t(`kinds.${kind}.title`)}
            </p>
            <span className="inline-block rounded-xs bg-white px-[11px] py-1.5 text-[10px] font-medium text-[#111]">
              {t("shopNow")}
            </span>
          </div>
        </div>

        <div className="flex items-baseline justify-between px-3.5 pb-2 pt-3.5 text-[11px] font-semibold">
          {t("bestSellers")}
          <span className="text-[10px] font-normal opacity-60">{t("seeAll")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 px-3 pb-3.5">
          {([1, 2, 3] as const).map((n) => (
            <div key={`${kind}-${n}`} className="pb-rise min-w-0" style={{ animationDelay: `${(n - 1) * 70}ms` }}>
              <div className="aspect-[4/5] overflow-hidden rounded-xs bg-[var(--sw-muted)] transition-colors duration-500">
                {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized sample photo */}
                <img
                  src={productPhoto(kind, n)}
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                />
              </div>
              <p className="mt-1.5 truncate text-[10px]">{t(`kinds.${kind}.item${n}`)}</p>
              <p className="text-[10px] font-semibold">{formatTaka(prices[n - 1], locale)}</p>
            </div>
          ))}
        </div>

        {whatsapp ? (
          <span
            className="pb-pop absolute bottom-3 right-3 flex size-[34px] items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_6px_16px_-4px_rgb(0_0_0/0.3)]"
            aria-hidden
          >
            <SocialMark platform="whatsapp" className="size-[19px]" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
