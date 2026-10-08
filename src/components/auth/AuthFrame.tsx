"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";
import { PLATFORM_LINKS } from "@/lib/platform-links";
import { cn } from "@/lib/utils";

import { AuthLanguageSwitch } from "./AuthLanguageSwitch";
import { ShopWall } from "./ShopWall";

/**
 * The frame of the dashboard's few pages outside it (the owner's designs, 2026-09-28): the team
 * invite, and the moments on the way to and back from Accounts, where signing in and up happen
 * (guidelines/accounts-plan.md) on pages drawn the same way.
 *
 * - Computer: on the left the page, centred, and at the foot of the screen © and "Need help?" on
 *   its own edges; on the right a dark panel holding the moving wall of shop photos (ShopWall)
 *   with one line in a tall serif at its foot, and the language switch in its top corner.
 * - Phone: the wall fills the screen, moving, its line just above the page, which is a sheet
 *   along the bottom. The photos always keep the top of the screen (about a third, at least
 *   9rem). A short screen scrolls.
 */

const LINK = "font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground";

/**
 * Words that become a link once Paperbase has the page (lib/platform-links.ts) -- plain words
 * until then (owner, 2026-09-28: "for now just text"), never a link to nowhere.
 */
function MaybeLink({ href, children }: { href: string; children: ReactNode }) {
  if (!href) return <span className="font-medium text-foreground">{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  );
}

/** "Need help? Talk to us", beside © at the foot. */
function HelpLine({ className }: { className?: string }) {
  const t = useTranslations("auth");
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {t("needHelp")} <MaybeLink href={PLATFORM_LINKS.help}>{t("talkToUs")}</MaybeLink>
    </span>
  );
}

export function AuthFrame({ children }: { children: ReactNode }) {
  const t = useTranslations("auth");
  const pathname = usePathname();
  // The line over the photos: a team invite welcomes the person instead (owner, 2026-10-02).
  const wall = pathname === "/team/invite" ? "inviteWall" : "wall";

  return (
    <div className="pb-motion relative min-h-dvh overflow-hidden bg-[#0d0e11] lg:grid lg:grid-cols-[minmax(27rem,1fr)_minmax(0,1.35fr)] lg:gap-3 lg:bg-background lg:p-3">
      <aside className="absolute inset-0 overflow-hidden lg:relative lg:order-2 lg:rounded-card lg:bg-[#141414] dark:lg:ring-1 dark:lg:ring-white/[0.06]">
        <ShopWall shade="responsive" />
        <div className="absolute inset-x-14 bottom-12 z-10 hidden text-white lg:block">
          <p className="pb-rise max-w-[34rem] text-[3.25rem] leading-[1.02] [font-family:var(--font-instrument-serif),var(--font-noto-sans-bengali),serif]">
            {t(`${wall}.title`)}
          </p>
          <p className="pb-rise mt-3 text-[15px] text-white/70" style={{ animationDelay: "120ms" }}>
            {t(`${wall}.body`)}
          </p>
        </div>
      </aside>

      {/* The top-right corner, over the photos, on a phone and a computer alike (owner, 2026-09-28). */}
      <AuthLanguageSwitch onPhoto className="absolute right-4 top-4 z-20 lg:right-7 lg:top-7" />
      <div className="relative z-10 flex min-h-dvh flex-col justify-end pt-[max(9rem,32dvh)] lg:order-1 lg:min-h-0 lg:items-center lg:justify-center lg:px-12 lg:py-10">
        {/* A phone's words over the moving photos, just above the sheet -- the line and the small
            one under it on a dark fade, as on a computer (owner, 2026-09-28). The fade reaches up
            past the words without taking room, and runs into the sheet's top edge. */}
        <div className="relative px-6 pb-5 text-white [text-shadow:0_2px_18px_rgb(0_0_0/0.65)] sm:mx-auto sm:w-[26rem] sm:px-0 lg:hidden">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-28 bottom-0 -z-10 bg-[linear-gradient(to_top,rgb(13_14_17/0.94),rgb(13_14_17/0.6)_55%,transparent)] sm:hidden"
          />
          <p className="pb-rise text-[1.875rem] leading-[1.05] [font-family:var(--font-instrument-serif),var(--font-noto-sans-bengali),serif]">
            {t(`${wall}.title`)}
          </p>
          <p className="pb-rise mt-2 text-[13px] text-white/75" style={{ animationDelay: "120ms" }}>
            {t(`${wall}.body`)}
          </p>
        </div>
        {/* On a computer the form and its foot are one column, centred in the half. */}
        <div className="pb-rise rounded-t-card bg-background px-6 pb-7 pt-6 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.5)] sm:mx-auto sm:mb-8 sm:w-[26rem] sm:rounded-card sm:px-8 lg:m-0 lg:w-full lg:max-w-[23rem] lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:[animation:none]">
          <main key={pathname} className="w-full">
            {children}
          </main>
          {/* No brand: the heading says Paperbase. © and "Need help?" are the foot -- the sheet's
              on a phone, the screen's on a computer, on the form's own edges (owner, 2026-09-28). */}
          <footer className="mt-6 flex items-center justify-between gap-3 text-xs text-muted-foreground lg:absolute lg:bottom-10 lg:left-1/2 lg:mt-0 lg:w-full lg:max-w-[23rem] lg:-translate-x-1/2">
            <span>© {new Date().getFullYear()} Paperbase</span>
            <HelpLine />
          </footer>
        </div>
      </div>
    </div>
  );
}
