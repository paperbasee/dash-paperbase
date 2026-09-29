"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { PLATFORM_LINKS } from "@/lib/platform-links";
import { getSafeNextPath, withNext } from "@/lib/safe-next";
import { cn } from "@/lib/utils";

import { AuthLanguageSwitch } from "./AuthLanguageSwitch";
import { AuthHeading } from "./AuthParts";
import { ShopWall } from "./ShopWall";

/**
 * Sign in, sign up and the pages an email link opens (the owner's designs, 2026-09-28).
 *
 * - Computer: on the left the form, centred, its heading naming Paperbase, and at the foot of
 *   the screen © and "Need help?" on the form's own edges; on the right a dark panel holding the
 *   moving wall of shop photos (ShopWall) with one line in a tall serif at its foot, and the
 *   language switch in its top corner.
 * - Phone: the wall fills the screen, moving, its line just above the form, which is a sheet
 *   along the bottom -- the owner kept this from the first version ("keep the mobile section as
 *   it was"). The photos always keep the top of the screen (about a third, at least 9rem): on a
 *   real phone, with the browser's own bars, the line and the sheet otherwise filled it and left
 *   the photos a dark strip under the language switch (2026-09-29). A short screen scrolls.
 *
 * It is the (auth) route group's layout, so moving between Sign in and Create account keeps the
 * wall moving and slides the tab across, instead of starting the page again.
 */

const HideTabs = createContext<(hidden: boolean) => void>(() => undefined);

/** A page that is past choosing -- "Check your email" -- puts the Sign in / Create account tabs away. */
export function useHideAuthTabs(hidden: boolean) {
  const setHidden = useContext(HideTabs);
  useEffect(() => {
    setHidden(hidden);
    return () => setHidden(false);
  }, [hidden, setHidden]);
}

function AuthTabs({ active, className }: { active: "signin" | "signup"; className?: string }) {
  const t = useTranslations("auth.tabs");
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"));
  const tab = "relative z-10 flex h-9 items-center justify-center rounded-xs text-[13px] font-medium transition-colors duration-300";
  return (
    <nav className={cn("relative grid grid-cols-2 rounded-ui bg-muted p-[3px]", className)} aria-label={t("label")}>
      <span
        aria-hidden
        className="absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-xs bg-background shadow-[0_1px_3px_rgb(15_23_42/0.12)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ transform: active === "signup" ? "translateX(100%)" : undefined }}
      />
      <Link
        href={withNext("/login", next)}
        aria-current={active === "signin" ? "page" : undefined}
        className={cn(tab, active === "signin" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
      >
        {t("signIn")}
      </Link>
      <Link
        href={withNext("/signup", next)}
        aria-current={active === "signup" ? "page" : undefined}
        className={cn(tab, active === "signup" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
      >
        {t("createAccount")}
      </Link>
    </nav>
  );
}

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

/** "By continuing, you agree to Paperbase's Terms and Privacy Policy." */
function AgreeLine() {
  const t = useTranslations("auth");
  return (
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
      {t.rich("agree", {
        terms: (chunks) => <MaybeLink href={PLATFORM_LINKS.terms}>{chunks}</MaybeLink>,
        privacy: (chunks) => <MaybeLink href={PLATFORM_LINKS.privacy}>{chunks}</MaybeLink>,
      })}
    </p>
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
  const tab = pathname === "/login" ? "signin" : pathname === "/signup" ? "signup" : null;
  const [tabsHidden, setTabsHidden] = useState(false);
  // Choosing between Sign in and Create account: the heading and the tabs are the frame's, so
  // they change in place; a page past choosing ("Check your email") has its own heading.
  const choosing = tab !== null && !tabsHidden;
  const heading = tab === "signup" ? "signup" : "login";

  return (
    <HideTabs.Provider value={setTabsHidden}>
      <div className="pb-motion relative min-h-dvh overflow-hidden bg-[#0d0e11] lg:grid lg:grid-cols-[minmax(27rem,1fr)_minmax(0,1.35fr)] lg:gap-3 lg:bg-background lg:p-3">
        <aside className="absolute inset-0 overflow-hidden lg:relative lg:order-2 lg:rounded-card lg:bg-[#141414] dark:lg:ring-1 dark:lg:ring-white/[0.06]">
          <ShopWall shade="responsive" />
          <div className="absolute inset-x-14 bottom-12 z-10 hidden text-white lg:block">
            <p className="pb-rise max-w-[34rem] text-[3.25rem] leading-[1.02] [font-family:var(--font-instrument-serif),var(--font-noto-sans-bengali),serif]">
              {t("wall.title")}
            </p>
            <p className="pb-rise mt-3 text-[15px] text-white/70" style={{ animationDelay: "120ms" }}>
              {t("wall.body")}
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
              {t("wall.title")}
            </p>
            <p className="pb-rise mt-2 text-[13px] text-white/75" style={{ animationDelay: "120ms" }}>
              {t("wall.body")}
            </p>
          </div>
          {/* On a computer the form and its foot are one column, centred in the half. */}
          <div className="pb-rise rounded-t-card bg-background px-6 pb-7 pt-6 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.5)] sm:mx-auto sm:mb-8 sm:w-[26rem] sm:rounded-card sm:px-8 lg:m-0 lg:w-full lg:max-w-[23rem] lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:[animation:none]">
            <main className="w-full">
              {tab && !tabsHidden ? (
                <div className="flex flex-col">
                  <AuthHeading
                    key={heading}
                    title={t(`${heading}.title`)}
                    body={t(`${heading}.subtitle`)}
                    className="pb-rise order-2 lg:order-1"
                  />
                  {/* On a phone the tabs come first, at the top of the sheet. */}
                  <AuthTabs active={tab} className="order-1 mb-5 lg:order-2 lg:mb-0 lg:mt-7" />
                </div>
              ) : null}
              <div key={pathname} className={choosing ? "mt-6" : undefined}>
                {children}
              </div>
              {choosing ? <AgreeLine /> : null}
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
    </HideTabs.Provider>
  );
}
