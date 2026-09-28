"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { getSafeNextPath, withNext } from "@/lib/safe-next";
import { cn } from "@/lib/utils";

import { AuthLanguageSwitch } from "./AuthLanguageSwitch";
import { AuthHeading, PaperbaseBrand } from "./AuthParts";
import { ShopWall } from "./ShopWall";

/**
 * Sign in, sign up and the pages an email link opens (the owner's design, 2026-09-28): the form on
 * the left, and on the right a dark panel holding the moving wall of shop photos (ShopWall) with
 * one line in a tall serif at its foot. A phone gets the panel as a band across the top, the form
 * under it. It is the (auth) route group's layout, so moving between Sign in and Create account
 * keeps the wall moving and slides the tab across, instead of starting the page again.
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
      <div className="pb-motion flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-[minmax(27rem,1fr)_minmax(0,1.35fr)] lg:gap-3 lg:p-3">
        <aside className="relative h-60 shrink-0 overflow-hidden bg-[#141414] sm:h-72 lg:order-2 lg:h-auto lg:rounded-card dark:ring-1 dark:ring-white/[0.06]">
          <ShopWall shade="panel" />
          <PaperbaseBrand className="absolute left-5 top-5 z-10 text-white sm:left-8 lg:hidden [&_img]:invert" />
          <div className="absolute inset-x-5 bottom-5 z-10 text-white sm:inset-x-8 sm:bottom-7 lg:inset-x-14 lg:bottom-12">
            <p className="pb-rise max-w-[34rem] text-[1.75rem] leading-[1.05] [font-family:var(--font-instrument-serif),var(--font-noto-sans-bengali),serif] sm:text-[2.25rem] lg:text-[3.25rem] lg:leading-[1.02]">
              {t("wall.title")}
            </p>
            <p className="pb-rise mt-3 hidden text-[15px] text-white/70 lg:block" style={{ animationDelay: "120ms" }}>
              {t("wall.body")}
            </p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col px-5 pb-5 pt-6 sm:px-10 lg:order-1 lg:px-[4.5rem] lg:py-10 xl:px-24">
          <PaperbaseBrand className="hidden lg:flex" />
          <main className="mx-auto flex w-full max-w-[23rem] flex-1 flex-col lg:mx-0 lg:justify-center lg:py-12">
            {tab && !tabsHidden ? (
              <div className="flex flex-col">
                <AuthHeading
                  key={heading}
                  title={t(`${heading}.title`)}
                  body={t(`${heading}.subtitle`)}
                  className="pb-rise order-2 lg:order-1"
                />
                {/* On a phone the tabs come first, right under the photos (the owner's design). */}
                <AuthTabs active={tab} className="order-1 mb-5 lg:order-2 lg:mb-0 lg:mt-7" />
              </div>
            ) : null}
            <div key={pathname} className={choosing ? "mt-6" : undefined}>
              {children}
            </div>
          </main>
          <footer className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Paperbase</span>
            <AuthLanguageSwitch />
          </footer>
        </div>
      </div>
    </HideTabs.Provider>
  );
}
