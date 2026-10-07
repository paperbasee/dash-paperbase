"use client";

import { GearIcon } from "@phosphor-icons/react";
import { ArrowUpRight, Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { cn } from "@/lib/utils";

/** The main menu's row, so these two read as part of it (AppSidebarNav). */
const ROW =
  "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors";
const IDLE =
  "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90";
const ON = "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95";

/**
 * Pinned under the main menu, above the account (owner, 2026-10-07): the live shop, which opens in
 * a new tab, and Settings, which moved here from the account menu. Everyone on the team sees both;
 * Settings shows each person only the parts their role allows.
 *
 * `storefrontUrl` is "" until the shop's address is known, and View my shop waits for it.
 */
export function SidebarShopLinks({
  collapsed,
  storefrontUrl,
  settingsActive,
  onNavigate,
}: {
  collapsed: boolean;
  storefrontUrl: string;
  settingsActive: boolean;
  onNavigate?: () => void;
}) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const label = (text: string) => (collapsed ? null : <span className="truncate">{text}</span>);

  return (
    <div className={cn("shrink-0 space-y-0.5 pb-2", collapsed ? "px-2" : "px-4")}>
      {storefrontUrl ? (
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={tNav("viewMyShopAria")}
          title={collapsed ? tNav("viewMyShop") : undefined}
          className={cn(ROW, IDLE, collapsed && "justify-center px-2")}
        >
          <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0 flex-1")}>
            <Store className="size-5 shrink-0" aria-hidden />
            {label(tNav("viewMyShop"))}
          </span>
          {!collapsed && <ArrowUpRight className="size-4 shrink-0 opacity-60" aria-hidden />}
        </a>
      ) : null}
      <DeferredNavLink
        href="/settings"
        onNavigate={onNavigate}
        aria-current={settingsActive ? "page" : undefined}
        title={collapsed ? tCommon("settings") : undefined}
        className={cn(ROW, settingsActive ? ON : IDLE, collapsed && "justify-center px-2")}
      >
        <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0 flex-1")}>
          <GearIcon weight="fill" className="size-5 shrink-0" aria-hidden />
          {label(tCommon("settings"))}
        </span>
      </DeferredNavLink>
    </div>
  );
}
