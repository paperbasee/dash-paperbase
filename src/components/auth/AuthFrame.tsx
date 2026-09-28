"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { getSafeNextPath, withNext } from "@/lib/safe-next";
import { cn } from "@/lib/utils";

import { AuthLanguageSwitch } from "./AuthLanguageSwitch";
import { PaperbaseBrand } from "./AuthParts";
import { ShopWall } from "./ShopWall";

/**
 * Sign in, sign up and the pages an email link opens (owner, 2026-09-28): one card over the shop
 * wall. It is the (auth) route group's layout, so moving between Sign in and Create account keeps
 * the wall moving and slides the tab across, instead of starting the page again. A phone gets the
 * card as a sheet along the bottom, the wall above it.
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

function AuthTabs({ active }: { active: "signin" | "signup" }) {
  const t = useTranslations("auth.tabs");
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"));
  const tab = "relative z-10 flex h-9 items-center justify-center rounded-xs text-[13px] font-medium transition-colors duration-300";
  return (
    <nav className="relative mb-6 grid grid-cols-2 rounded-ui bg-muted p-[3px]" aria-label={t("label")}>
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
  const t = useTranslations("auth.wall");
  const pathname = usePathname();
  const tab = pathname === "/login" ? "signin" : pathname === "/signup" ? "signup" : null;
  const [tabsHidden, setTabsHidden] = useState(false);

  return (
    <HideTabs.Provider value={setTabsHidden}>
      <div className="pb-motion relative min-h-dvh overflow-hidden bg-[#0d0e11]">
        <ShopWall />
        <div className="relative z-10 flex min-h-dvh items-end justify-center sm:items-center sm:p-6 sm:pb-24 lg:pb-6">
          <div className="pb-rise w-full rounded-t-card bg-background px-6 pb-8 pt-6 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.5)] sm:w-[24.5rem] sm:rounded-card sm:px-[30px] sm:pb-[26px] sm:pt-[30px] sm:shadow-[0_1px_0_rgb(15_23_42/0.04),0_40px_80px_-30px_rgb(15_23_42/0.45),0_0_0_1px_rgb(15_23_42/0.06)]">
            <PaperbaseBrand className="mb-5 sm:mb-[22px]" />
            {tab && !tabsHidden ? <AuthTabs active={tab} /> : null}
            <div key={pathname}>{children}</div>
            <footer className="mt-5 flex justify-end">
              <AuthLanguageSwitch />
            </footer>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-8 left-9 z-10 hidden max-w-[27rem] text-white lg:block">
          <p className="pb-rise text-[30px] leading-[1.15] tracking-[-0.01em] [font-family:var(--font-playfair),var(--font-noto-sans-bengali),serif]">
            {t("title")}
          </p>
          <p className="pb-rise mt-2 text-[13px] text-white/65" style={{ animationDelay: "120ms" }}>
            {t("body")}
          </p>
        </div>
      </div>
    </HideTabs.Provider>
  );
}
