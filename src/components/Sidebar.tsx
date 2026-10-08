"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { useSearchParams } from "next/navigation";
import {
  CommandIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import {
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import { useSearchModal } from "@/context/SearchModalContext";
import { QuickCreateMenu } from "@/components/QuickCreateMenu";
import { useWhatsNew } from "@/context/WhatsNewContext";
import { useCanShowApp } from "@/hooks/useCanShowApp";
import { useSidebarData } from "@/context/SidebarDataContext";
import {
  APP_CONFIG,
  CATALOG_SUB_APP_IDS,
  NAV_CHILD_APP_IDS,
  MAIN_NAV_APP_IDS,
  MORE_APP_IDS,
  type NavCounts,
} from "@/config/apps";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { isNavHrefActive } from "@/lib/navigation/nav-active";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  CORE_LOCALE_STORAGE_KEY,
  setLocalePreferenceCookie,
} from "@/lib/locale-storage";
import type { AppLocale } from "@/i18n/routing";
import {
  applyThemePreference,
  getStoredThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { runThemeTransition } from "@/lib/theme-transition/transition";
import SystemNotificationBanner from "@/components/system/SystemNotificationBanner";
import AppSidebarNav from "@/components/sidebar/AppSidebarNav";
import { SidebarShopLinks } from "@/components/sidebar/SidebarShopLinks";
import { UserMenuBody } from "@/components/sidebar/UserMenuBody";
import { accountPageUrl } from "@/lib/accounts/config";
import { useStorefrontUrl } from "@/hooks/useStorefrontUrl";
import SettingsSidebarNav from "@/components/sidebar/SettingsSidebarNav";
import { useVisibleSettingsSections } from "@/app/[locale]/(dashboard)/settings/useVisibleSettingsSections";

/**
 * Top-level nav order; `__catalog__` is the Products / catalog group.
 * Built from MAIN_NAV_APP_IDS so new main-nav apps (e.g. blog) appear automatically.
 */
const MAIN_NAV_SEQUENCE = [
  MAIN_NAV_APP_IDS[0],
  "__catalog__",
  ...MAIN_NAV_APP_IDS.slice(1),
] as const;

function logoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

const HOME_NAV = {
  href: "/",
  countKey: null as keyof NavCounts | null,
};

type SidebarNavVariant = "app" | "settings";

function SidebarContent({
  collapsed,
  onNavigate,
  onToggle,
  showSystemNotification = true,
  navVariant = "app",
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
  showSystemNotification?: boolean;
  navVariant?: SidebarNavVariant;
}) {
  const expandIfCollapsed = useCallback(() => {
    if (collapsed) {
      onToggle?.();
    }
  }, [collapsed, onToggle]);

  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");
  const tCommon = useTranslations("common");
  const tSettings = useTranslations("settings");
  const tWhatsNew = useTranslations("whatsNew");
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut, meProfile, meProfileStatus } = useAuth();
  const { branding, navCounts, inventoryStatus } = useSidebarData();
  const { data: brandingData, isLoading: isBrandingLoading } = branding;
  const { counts, formatCount } = navCounts;
  const { setOpen: setSearchOpen } = useSearchModal();
  const { hasUnread: whatsNewUnread, unreadCount: whatsNewUnreadCount, openPanel: openWhatsNew } = useWhatsNew();
  const canShowApp = useCanShowApp();
  const storefrontUrl = useStorefrontUrl();
  const settingsSections = useVisibleSettingsSections();

  const mainNavSequence = useMemo(
    () =>
      (MAIN_NAV_SEQUENCE as readonly string[]).filter((token) => {
        if (token === "__catalog__") return true;
        if (!APP_CONFIG[token]?.href) return false;
        return canShowApp(token);
      }),
    [canShowApp]
  );
  const inventoryNavStatus = inventoryStatus.status;
  // The face is the one chosen in the person's Paperbase account (`avatar_seed`), else their own.
  const userPublicId =
    meProfileStatus === "ready" ? (meProfile?.avatar_seed || meProfile?.public_id || null) : null;
  const userPlan =
    meProfileStatus === "ready" ? (meProfile?.subscription?.plan ?? null) : null;
  const urgentSubscriptionRing =
    meProfileStatus === "ready" &&
    (meProfile?.subscription?.subscription_status === "GRACE" ||
      meProfile?.subscription?.subscription_status === "EXPIRED");
  const [catalogOpen, setCatalogOpen] = useState(false);

  const isActive = (href: string) => isNavHrefActive(pathname, href);

  const catalogLinks = CATALOG_SUB_APP_IDS.filter(
    (id) => canShowApp(id) && APP_CONFIG[id]?.href
  );
  const showCatalog = catalogLinks.length > 0;
  const catalogChildActive = catalogLinks.some((id) => {
    const href = APP_CONFIG[id]?.href;
    return href ? isActive(href) : false;
  });

  const showMore = MORE_APP_IDS.some((id) => canShowApp(id) && APP_CONFIG[id]?.href);
  const moreLinks = MORE_APP_IDS.filter((id) => canShowApp(id) && APP_CONFIG[id]?.href);
  const moreChildActive = moreLinks.some((id) => {
    const href = APP_CONFIG[id]?.href;
    return href ? isActive(href) : false;
  });
  const [celeryOpen, setCeleryOpen] = useState(false);

  // Which parents have their children showing. A set rather than one flag per
  // parent, so adding a third costs nothing.
  const [openChildren, setOpenChildren] = useState<Set<string>>(new Set());
  const setChildrenOpen = useCallback((appId: string, open: boolean) => {
    setOpenChildren((prev) => {
      if (prev.has(appId) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(appId);
      else next.delete(appId);
      return next;
    });
  }, []);

  // Only the children this shop actually has: these three are off until a
  // merchant switches them on, and a sidebar entry for something the storefront
  // does not serve is a link to a 404.
  const navChildren = useMemo(() => {
    const out: Record<string, readonly string[]> = {};
    for (const [parent, ids] of Object.entries(NAV_CHILD_APP_IDS)) {
      const shown = ids.filter((id) => canShowApp(id) && APP_CONFIG[id]?.href);
      // More than the parent's own page, or there is no tree worth opening --
      // a group containing only "Orders" is a row that costs a click and
      // shows nothing. It stays an ordinary link until the shop switches the
      // second thing on.
      if (shown.some((id) => id !== parent)) out[parent] = shown;
    }
    return out;
  }, [canShowApp]);

  useEffect(() => {
    if (showCatalog && catalogChildActive) setCatalogOpen(true);
    if (showMore && moreChildActive) setCeleryOpen(true);
    // A group whose page you are already on opens itself, the same way Catalog
    // does. Landing on /orders/abandoned from a link or a reload and finding
    // the tree shut gives no clue where you are.
    setOpenChildren((prev) => {
      const next = new Set(prev);
      for (const [parent, ids] of Object.entries(navChildren)) {
        const onOne = ids.some((id) => {
          const href = APP_CONFIG[id]?.href;
          return href ? isActive(href) : false;
        });
        if (onOne) next.add(parent);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [
    pathname,
    showCatalog,
    catalogChildActive,
    showMore,
    moreChildActive,
    navChildren,
  ]);
  const [theme, setTheme] = useState<ThemePreference>("system");
  /** Controlled so we can expand the sidebar first, then open the menu when collapsed. */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  /** Profile menu trigger; focus returns here when the What's new panel closes. */
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);
  /** Set when "What's new" is picked; the panel opens once the menu has finished closing. */
  const whatsNewPendingRef = useRef(false);
  /** Mobile sheet: center menu and size below nav panel width (desktop-style inset). */
  const [mobileUserMenuLayout, setMobileUserMenuLayout] = useState(false);
  // Next.js route prefetching can trigger Chrome warnings in dev about preloaded CSS
  // not being used "soon enough". Keep prefetch on in prod, disable in dev.
  const shouldPrefetchLinks = process.env.NODE_ENV === "production";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767.98px)");
    const sync = () => setMobileUserMenuLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = getStoredThemePreference() ?? "system";
    setTheme(initial);
  }, []);

  useEffect(() => {
    if (collapsed) setUserMenuOpen(false);
  }, [collapsed]);

  const handleThemeChange = (next: ThemePreference, event: React.MouseEvent) => {
    runThemeTransition({
      next,
      event,
      setThemePreferenceState: setTheme,
    });
  };

  const switchUserMenuLocale = (next: AppLocale) => {
    if (next === locale) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(CORE_LOCALE_STORAGE_KEY, next);
      setLocalePreferenceCookie(next);
    }
    router.replace(pathname, { locale: next });
  };

  const showBrandingSkeleton = isBrandingLoading && !brandingData;
  const adminName = brandingData?.admin_name?.trim() || tSidebar("setInSettings");
  const storeType = brandingData?.store_type ?? "";
  const ownerName = brandingData?.owner_name?.trim() || tSidebar("setInSettings");
  const ownerEmail = brandingData?.owner_email || "";

  // Footer identity reflects the LOGGED-IN user (owner or staff), not the
  // store's owner branding — so a moderator sees their own email + role.
  const meReady = meProfileStatus === "ready";
  const userEmail = meReady ? (meProfile?.email?.trim() || "") : "";
  const userFullName = meReady ? (meProfile?.full_name?.trim() || "") : "";
  // Backend get_store.role → "Owner" for owners, the RBAC role name for staff.
  const roleLabel = meReady ? (meProfile?.store?.role?.trim() || "") : "";
  const footerName = userFullName || roleLabel || ownerName;
  const footerEmail = userEmail || ownerEmail;
  // Show the role as a chip only when it isn't already the primary line.
  const showRoleChip = Boolean(roleLabel) && roleLabel !== footerName;
  const showUserSkeleton = !meReady;
  const resolvedLogoUrl = logoUrl(brandingData?.logo_url ?? null);
  const initial = adminName.charAt(0).toUpperCase() || "?";

  const handleLinkClick = () => {
    onNavigate?.();
  };

  const isSettingsRoute = pathname.startsWith("/settings");

  const handleUserMenuCloseAutoFocus = (event: Event) => {
    if (!whatsNewPendingRef.current) return;
    whatsNewPendingRef.current = false;
    // The panel takes focus itself; returning it to the trigger first would flash a ring.
    event.preventDefault();
    openWhatsNew(userMenuTriggerRef.current);
    // In the mobile sheet, get the nav drawer out of the way of the full-width panel.
    onNavigate?.();
  };

  const handleUserMenuOpenChange = (open: boolean) => {
    if (open && collapsed && onToggle) {
      onToggle();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setUserMenuOpen(true));
      });
      return;
    }
    setUserMenuOpen(open);
  };

  return (
    <>
      {/* Header: when collapsed show only toggle button; when expanded show logo + name + subtitle + toggle */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
        style={{ height: "var(--header-height)" }}
      >
        {collapsed ? (
          onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="flex w-full shrink-0 items-center justify-center rounded-xs px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90 md:flex"
              aria-label={tSidebar("expandSidebar")}
            >
              <SidebarSimpleIcon className="size-5" />
            </button>
          ) : (
            <span className="size-9 shrink-0" />
          )
        ) : (
          <>
            {showBrandingSkeleton ? (
              <Skeleton className="size-10 shrink-0 rounded-full" />
            ) : resolvedLogoUrl ? (
              <img
                src={resolvedLogoUrl}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {showBrandingSkeleton ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-36 rounded-xs" />
                  <Skeleton className="h-3 w-24 rounded-xs" />
                </div>
              ) : (
                <>
                  <span className="block truncate text-lg font-medium text-foreground">
                    {adminName}
                  </span>
                  {storeType ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {storeType}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
        {!collapsed && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="hidden shrink-0 items-center justify-center rounded-xs px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90 md:flex"
            aria-label={tSidebar("collapseSidebar")}
          >
            <SidebarSimpleIcon className="size-4" />
          </button>
        )}
      </div>

      {/* Search: on mobile handled by top-bar icon; on desktop open modal */}
      {!collapsed && (
        <div className="hidden px-4 py-4 md:block">
          {/* Desktop: trigger opens search modal (mobile uses top-bar search icon) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="relative hidden h-10 w-full items-center gap-2 overflow-hidden rounded-xs border border-border bg-muted/50 pl-9 pr-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
            aria-label={tSidebar("openSearch")}
          >
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" />
            <span className="min-w-0 flex-1 truncate pr-0">
              {tSidebar("searchPlaceholder")}
            </span>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <kbd className="inline-flex h-5 shrink-0 items-center justify-center gap-0.5 rounded-xs border border-border bg-background px-1.5 text-[10px] leading-none text-muted-foreground">
                    <CommandIcon className="size-3 shrink-0" aria-hidden />
                    <span className="translate-y-px">K</span>
                  </kbd>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {tSidebar("searchShortcut")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav
        className={cn(
          "scrollbar-slim min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-6",
          collapsed ? "px-2 pt-2" : "px-4"
        )}
      >
        {navVariant === "settings" ? (
          <SettingsSidebarNav
            collapsed={collapsed}
            pathname={pathname}
            settingsTab={searchParams.get("tab")}
            shouldPrefetchLinks={shouldPrefetchLinks}
            onNavigate={handleLinkClick}
            tCommonSettingsLabel={tCommon("settings")}
            tBackToHomeLabel={tSettings("goBackAria")}
            tSettings={tSettings}
          />
        ) : (
          <AppSidebarNav
            collapsed={collapsed}
            pathname={pathname}
            shouldPrefetchLinks={shouldPrefetchLinks}
            onNavigate={handleLinkClick}
            tNavLabel={tNav("navigation")}
            // Add new: the quick ways to add something (config/quick-create.ts), under the label.
            quickCreate={
              <QuickCreateMenu
                collapsed={collapsed}
                onNavigate={handleLinkClick}
                className={collapsed ? "flex justify-center pb-2" : "px-1 pb-3"}
              />
            }
            tCatalogLabel={tNav("catalog")}
            tMoreLabel={tNav("more")}
            tAppLabel={tNav}
            counts={counts}
            formatCount={formatCount}
            numClass={numClass}
            homeHref={HOME_NAV.href}
            catalogLinks={catalogLinks}
            navChildren={navChildren}
            openChildren={openChildren}
            onSetChildrenOpen={setChildrenOpen}
            showCatalog={showCatalog}
            catalogChildActive={catalogChildActive}
            catalogOpen={catalogOpen}
            setCatalogOpen={setCatalogOpen}
            showMore={showMore}
            moreLinks={moreLinks}
            moreChildActive={moreChildActive}
            celeryOpen={celeryOpen}
            setCeleryOpen={setCeleryOpen}
            inventoryNavStatus={inventoryNavStatus}
            mainNavSequence={mainNavSequence}
            onExpandIfCollapsed={expandIfCollapsed}
          />
        )}
      </nav>

      {/* The main menu's foot only: the Settings menu has its own way back, and is Settings (owner, 2026-10-07). */}
      {navVariant !== "settings" && (
        <SidebarShopLinks
          collapsed={collapsed}
          storefrontUrl={storefrontUrl}
          hasSettings={settingsSections.length > 0}
          settingsActive={isSettingsRoute}
          onNavigate={handleLinkClick}
        />
      )}

      {showSystemNotification && !collapsed && (
        <div className="shrink-0 px-4 pb-3">
          <SystemNotificationBanner placement="sidebar" />
        </div>
      )}

      {/* User menu — when collapsed, keep padding tight so the avatar stays circular (w-16 minus padding). */}
      <div
        className={cn(
          "shrink-0 border-t border-border",
          collapsed ? "px-1 pt-2 pb-1" : "px-4 pt-3 pb-2"
        )}
      >
        <DropdownMenu open={userMenuOpen} onOpenChange={handleUserMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              ref={userMenuTriggerRef}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-xs border-0 bg-transparent text-left transition-colors",
                "outline-none hover:bg-accent",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                collapsed ? "justify-center px-0 py-2" : "p-3",
                collapsed && "min-h-11"
              )}
              aria-label={
                whatsNewUnread ? tWhatsNew("userMenuUnreadAria") : tSidebar("userMenu")
              }
            >
              <span className="relative flex shrink-0 items-center justify-center">
                <UserAvatar publicId={userPublicId} name={footerName} plan={userPlan} urgentSubscriptionRing={urgentSubscriptionRing} />
                {whatsNewUnread ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background"
                    aria-hidden
                  />
                ) : null}
              </span>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    {showUserSkeleton ? (
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28 rounded-ui" />
                        <Skeleton className="h-3 w-36 rounded-ui" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {footerName}
                          </p>
                          {showRoleChip && (
                            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {roleLabel}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {footerEmail || tSidebar("setInSettings")}
                        </p>
                      </>
                    )}
                  </div>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            side="top"
            onCloseAutoFocus={handleUserMenuCloseAutoFocus}
            className={cn(
              "z-[80] overflow-hidden rounded-xs border border-border/80 p-0 shadow-lg",
              mobileUserMenuLayout
                ? // Match profile row width (w-64 sheet minus p-4); ! beats popover defaults
                  "!w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12.5rem] max-w-[min(100vw-1.5rem,14rem)]"
                : // Desktop: centered under user row; cap to trigger width (expanded) but keep usable min when collapsed
                  "w-[max(11rem,min(100vw-2rem,16.5rem,var(--radix-dropdown-menu-trigger-width)))]"
            )}
          >
            <UserMenuBody
              theme={theme}
              onThemeChange={handleThemeChange}
              locale={locale as AppLocale}
              onLocaleChange={switchUserMenuLocale}
              unreadCount={whatsNewUnreadCount}
              onWhatsNew={() => {
                whatsNewPendingRef.current = true;
              }}
              accountHref={meProfile?.support_session ? null : accountPageUrl()}
              onSignOut={() => {
                signOut();
              }}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  navVariant?: SidebarNavVariant;
}

export default function Sidebar({ collapsed, onToggle, onNavigate, navVariant }: SidebarProps) {
  return (
    <aside
      className={cn(
        "z-40 hidden flex-col border-r border-border bg-background transition-[width] duration-300 md:relative md:flex md:h-full md:min-h-0 md:shrink-0 md:flex-col md:overflow-hidden",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <SidebarContent
        collapsed={collapsed}
        onNavigate={onNavigate}
        onToggle={onToggle}
        navVariant={navVariant}
      />
    </aside>
  );
}

export { SidebarContent };
