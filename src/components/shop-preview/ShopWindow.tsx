import { Lock } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { SocialMark } from "@/components/SocialMark";
import type { PaletteTokens } from "@/lib/theme-editor/palettes";
import { cn } from "@/lib/utils";

import { ShopHome } from "./ShopHome";
import type { ShopKind } from "./samples";

/** The width a computer's page is drawn at -- a real laptop's; `ScaleToFit` shrinks it to fit. */
export const SHOP_WINDOW_WIDTH = 1280;

/** The width a phone's page is drawn at -- a real phone's. */
export const SHOP_PHONE_WIDTH = 390;

/** How tall the window is when it is not filling a box: a screen's worth of the page. */
const WINDOW_HEIGHT = { computer: 800, phone: 760 } as const;

/** Which screen the shop is shown on: a computer's browser or a phone's. */
export type ShopDevice = "computer" | "phone";

/**
 * The look of the window when no palette is given: the sign-in picture, and setup before the
 * palettes have loaded. Quiet white and ink, the dashboard's own -- not one of the shop palettes,
 * whose colours are the API's (`theming/presets/`).
 */
const PLAIN_LOOK: PaletteTokens = {
  background: "#ffffff",
  foreground: "#0f172a",
  muted: "#f3f2ef",
  muted_foreground: "#64748b",
  card: "#f3f2ef",
  border: "#e7e5e0",
  primary: "#0f172a",
  primary_foreground: "#ffffff",
  accent: "#0f172a",
  accent_foreground: "#ffffff",
  header: "#ffffff",
  header_foreground: "#0f172a",
};

function lookVars(tokens: PaletteTokens | null | undefined): CSSProperties {
  const look = { ...PLAIN_LOOK, ...(tokens ?? {}) };
  return {
    "--sw-bg": look.background,
    "--sw-fg": look.foreground,
    "--sw-muted": look.muted,
    "--sw-card": look.card,
    "--sw-border": look.border,
    "--sw-brand": look.primary,
    "--sw-brand-fg": look.primary_foreground,
    "--sw-accent": look.accent,
    "--sw-accent-fg": look.accent_foreground,
    "--sw-header": look.header,
    "--sw-header-fg": look.header_foreground,
  } as CSSProperties;
}

/**
 * A browser window, a computer's or a phone's, with the shop's address in its bar and a page in
 * it: the drawn sample (ShopWindow) or the real shop in a frame (setup's last screen).
 *
 * - `fill`: the window takes its box's height -- setup's panel, where it runs off the panel's foot
 *   (owner, 2026-09-28: "no empty space in the live preview"). Otherwise it is a screen tall.
 */
export function BrowserFrame({
  hostname,
  hostnameFlashKey,
  device = "computer",
  fill = false,
  className,
  children,
}: {
  hostname: string;
  /** Changing it flashes the address bar green: a new address was just given. */
  hostnameFlashKey?: string | number;
  device?: ShopDevice;
  fill?: boolean;
  className?: string;
  /** The page: it fills the window under the bar. */
  children: ReactNode;
}) {
  const phone = device === "phone";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-white text-left shadow-[0_1px_0_rgb(15_23_42/0.04),0_40px_80px_-30px_rgb(15_23_42/0.4)] ring-1 ring-black/[0.06]",
        phone ? "rounded-[36px]" : "rounded-[14px]",
        // Runs off the foot of its box, so no bottom corners.
        fill && "h-full rounded-b-none",
        className
      )}
      style={{
        width: phone ? SHOP_PHONE_WIDTH : SHOP_WINDOW_WIDTH,
        height: fill ? undefined : WINDOW_HEIGHT[device],
      }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-4 border-b border-black/[0.06] bg-[#f6f6f4]",
          phone ? "h-[58px] px-5 pt-2" : "h-[46px] px-4"
        )}
      >
        {phone ? null : (
          <span className="flex gap-2" aria-hidden>
            <i className="size-3 rounded-full bg-[#e2e2de]" />
            <i className="size-3 rounded-full bg-[#e2e2de]" />
            <i className="size-3 rounded-full bg-[#e2e2de]" />
          </span>
        )}
        <span
          key={hostnameFlashKey}
          className={cn(
            "mx-auto flex h-[30px] flex-1 items-center justify-center gap-2 overflow-hidden whitespace-nowrap bg-[#ebebe8] px-3 text-[14px] text-[#475569]",
            phone ? "rounded-full" : "max-w-[520px] rounded-[8px]",
            hostnameFlashKey !== undefined && "pb-flash"
          )}
        >
          <Lock className="size-3.5 shrink-0 text-[#15803d]" aria-hidden />
          <span className="truncate">{hostname}</span>
        </span>
        {phone ? null : <span className="w-[52px]" aria-hidden />}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * The owner's shop drawn in a browser window: the sample home page (ShopHome) in their name,
 * address, colours and contact, a screen of it at a time, scrolling inside like a browser.
 * Colours change by transition, so a new palette washes over it.
 */
export function ShopWindow({
  name,
  hostname,
  kind,
  tokens,
  announcement,
  contact = null,
  whatsapp = false,
  facebook = false,
  hostnameFlashKey,
  device = "computer",
  fill = false,
  className,
}: {
  name: string;
  hostname: string;
  kind: ShopKind;
  tokens?: PaletteTokens | null;
  announcement: string;
  /** The owner's number, once they have given it: shown in the shop's footer. */
  contact?: string | null;
  whatsapp?: boolean;
  facebook?: boolean;
  hostnameFlashKey?: string | number;
  device?: ShopDevice;
  fill?: boolean;
  className?: string;
}) {
  const phone = device === "phone";

  return (
    <BrowserFrame hostname={hostname} hostnameFlashKey={hostnameFlashKey} device={device} fill={fill} className={className}>
      <div
        className="absolute inset-0 bg-[var(--sw-bg)] text-[var(--sw-fg)] transition-colors duration-500"
        style={lookVars(tokens)}
      >
        <div className="scrollbar-hide h-full overflow-y-auto overscroll-contain">
          <div
            className={cn(
              "bg-[var(--sw-brand)] text-center text-[var(--sw-brand-fg)] transition-colors duration-500",
              phone ? "px-4 py-2 text-[11px]" : "py-2.5 text-[13px]"
            )}
          >
            {announcement}
          </div>
          <ShopHome kind={kind} name={name} phone={phone} contact={contact} facebook={facebook} />
        </div>

        {/* Over the page, not in it: it stays in the corner as the page scrolls, as the shop's does. */}
        {whatsapp ? (
          <span
            className={cn(
              "pb-pop absolute flex items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_8px_20px_-6px_rgb(0_0_0/0.35)]",
              phone ? "bottom-5 right-4 size-12" : "bottom-6 right-6 size-14"
            )}
            aria-hidden
          >
            <SocialMark platform="whatsapp" className={phone ? "size-6" : "size-7"} />
          </span>
        ) : null}
      </div>
    </BrowserFrame>
  );
}
