"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { PLATFORM_LINKS } from "@/lib/platform-links";
import { getSafeNextPath, withNext } from "@/lib/safe-next";
import { cn } from "@/lib/utils";

import { AuthLanguageSwitch } from "./AuthLanguageSwitch";
import { AuthHeading, PaperbaseBrand } from "./AuthParts";
import { ShopWall } from "./ShopWall";

/**
 * Sign in, sign up and the pages an email link opens (the owner's designs, 2026-09-28).
 *
 * - Computer: on the left one centred column -- the brand, the form, and the foot (© and the
 *   language) under it, all on one edge; on the right a dark panel holding the moving wall of
 *   shop photos (ShopWall) with one line in a tall serif at its foot.
 * - Phone: the wall fills the screen, moving, its line just above the form, which is a sheet
 *   along the bottom -- the owner kept this from the first version ("keep the mobile section as
 *   it was").
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

/** "By continuing you agree to ..." -- only where Paperbase has terms and a privacy policy to show. */
function AgreeLine() {
  const t = useTranslations("auth");
  if (!PLATFORM_LINKS.terms || !PLATFORM_LINKS.privacy) return null;
  const link = (href: string) => (chunks: ReactNode) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {chunks}
    </a>
  );
  return (
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
      {t.rich("agree", { terms: link(PLATFORM_LINKS.terms), privacy: link(PLATFORM_LINKS.privacy) })}
    </p>
  );
}

/** The foot's left side: © on a computer, and "Need help? Talk to us" where there is somewhere to ask. */
function FootLine() {
  const t = useTranslations("auth");
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      <span className="hidden lg:inline">© {new Date().getFullYear()} Paperbase</span>
      {PLATFORM_LINKS.help ? (
        <>
          <span className="hidden lg:inline" aria-hidden>
            ·
          </span>
          <span>
            {t("needHelp")}{" "}
            <a href={PLATFORM_LINKS.help} target="_blank" rel="noopener noreferrer" className={LINK}>
              {t("talkToUs")}
            </a>
          </span>
        </>
      ) : null}
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

        <div className="relative z-10 flex min-h-dvh flex-col justify-end lg:order-1 lg:min-h-0 lg:items-center lg:justify-center lg:px-12 lg:py-10">
          {/* A phone's line over the moving photos, just above the sheet. */}
          <p className="pb-rise px-6 pb-5 text-[1.875rem] leading-[1.05] text-white [text-shadow:0_2px_18px_rgb(0_0_0/0.65)] [font-family:var(--font-instrument-serif),var(--font-noto-sans-bengali),serif] sm:mx-auto sm:w-[26rem] sm:px-0 lg:hidden">
            {t("wall.title")}
          </p>
          {/* On a computer the brand, the form and the foot are one column, centred in the half. */}
          <div className="pb-rise rounded-t-card bg-background px-6 pb-7 pt-6 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.5)] sm:mx-auto sm:mb-8 sm:w-[26rem] sm:rounded-card sm:px-8 lg:m-0 lg:w-full lg:max-w-[23rem] lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:[animation:none]">
            <PaperbaseBrand className="mb-5 lg:mb-10" />
            <main className="w-full">
              {tab && !tabsHidden ? (
                <div className="flex flex-col">
                  <AuthHeading
                    key={heading}
                    title={t(`${heading}.title`)}
                    body={t(`${heading}.subtitle`)}
                    className="pb-rise order-2 lg:order-1"
                  />
                  {/* On a phone the tabs come first, right under the brand. */}
                  <AuthTabs active={tab} className="order-1 mb-5 lg:order-2 lg:mb-0 lg:mt-7" />
                </div>
              ) : null}
              <div key={pathname} className={choosing ? "mt-6" : undefined}>
                {children}
              </div>
              {choosing ? <AgreeLine /> : null}
            </main>
            <footer className="mt-6 flex items-center justify-between gap-3 text-xs text-muted-foreground lg:mt-10">
              <FootLine />
              <AuthLanguageSwitch />
            </footer>
          </div>
        </div>
      </div>
    </HideTabs.Provider>
  );
}
