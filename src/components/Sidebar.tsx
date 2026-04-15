"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  Birdhouse,
  ListTodo,
  ChevronDown,
  ChevronRight,
  PanelRightOpen,
  PanelRightClose,
  Search,
  LogOut,
  Settings,
  LayoutGrid,
  Copy,
  Check,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { useBranding, defaultBranding } from "@/context/BrandingContext";
import UserAvatar from "@/components/UserAvatar";
import { useSearchModal } from "@/context/SearchModalContext";
import { useNavCounts } from "@/hooks/useNavCounts";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import {
  APP_CONFIG,
  CATALOG_SUB_APP_IDS,
  MORE_APP_IDS,
  type NavCounts,
} from "@/config/apps";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  CORE_LOCALE_STORAGE_KEY,
  setLocalePreferenceCookie,
} from "@/lib/locale-storage";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  applyThemePreference,
  getStoredThemePreference,
  persistThemePreference,
  subscribeToSystemThemeChanges,
  type ThemePreference,
} from "@/lib/theme";
import SystemNotificationBanner from "@/components/system/SystemNotificationBanner";

/** Top-level nav order; `__catalog__` is the Products / catalog group. */
const MAIN_NAV_SEQUENCE = [
  "orders",
  "__catalog__",
  "customers",
  "inventory",
  "shipping",
  "cta",
  "banners",
] as const;

function logoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

const HOME_NAV = {
  href: "/",
  icon: Birdhouse,
  countKey: null as keyof NavCounts | null,
};

function SidebarContent({
  collapsed,
  onNavigate,
  onToggle,
  showSystemNotification = true,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
  showSystemNotification?: boolean;
}) {
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");
  const tCommon = useTranslations("common");
  const tLang = useTranslations("language");
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isAuthenticated, meProfile, meProfileStatus } = useAuth();
  const { branding } = useBranding();
  const { setOpen: setSearchOpen } = useSearchModal();
  const { counts, formatCount } = useNavCounts();
  const { isEnabled } = useEnabledApps();
  const userPublicId =
    meProfileStatus === "ready" ? (meProfile?.public_id ?? null) : null;
  const userPlan =
    meProfileStatus === "ready" ? (meProfile?.subscription?.plan ?? null) : null;
  const urgentSubscriptionRing =
    meProfileStatus === "ready" &&
    (meProfile?.subscription?.subscription_status === "GRACE" ||
      meProfile?.subscription?.subscription_status === "EXPIRED");
  const [catalogOpen, setCatalogOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const catalogLinks = CATALOG_SUB_APP_IDS.filter(
    (id) => isEnabled(id) && APP_CONFIG[id]?.href
  );
  const showCatalog = catalogLinks.length > 0;
  const catalogChildActive = catalogLinks.some((id) => {
    const href = APP_CONFIG[id]?.href;
    return href ? isActive(href) : false;
  });

  useEffect(() => {
    if (showCatalog && catalogChildActive) setCatalogOpen(true);
  }, [pathname, showCatalog, catalogChildActive]);

  const showMore = MORE_APP_IDS.some((id) => isEnabled(id) && APP_CONFIG[id]?.href);
  const moreLinks = MORE_APP_IDS.filter((id) => isEnabled(id) && APP_CONFIG[id]?.href);
  const moreChildActive = moreLinks.some((id) => {
    const href = APP_CONFIG[id]?.href;
    return href ? isActive(href) : false;
  });
  const [celeryOpen, setCeleryOpen] = useState(false);
  useEffect(() => {
    if (showMore && moreChildActive) setCeleryOpen(true);
  }, [pathname, showMore, moreChildActive]);
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>("system");
  /** Controlled so we can expand the sidebar first, then open the menu when collapsed. */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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

  useEffect(() => {
    if (theme !== "system") return;
    return subscribeToSystemThemeChanges(() => applyThemePreference("system"));
  }, [theme]);

  const handleThemeChange = (next: ThemePreference) => {
    setTheme(next);
    if (typeof window === "undefined") return;
    persistThemePreference(next);
    applyThemePreference(next);
  };

  const switchUserMenuLocale = (next: AppLocale) => {
    if (next === locale) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(CORE_LOCALE_STORAGE_KEY, next);
      setLocalePreferenceCookie(next);
    }
    router.replace(pathname, { locale: next });
  };

  const adminName = branding?.admin_name ?? defaultBranding.admin_name;
  const storeType = branding?.store_type ?? "";
  const ownerName = branding?.owner_name || "Owner";
  const ownerEmail = branding?.owner_email || "";
  const resolvedLogoUrl = logoUrl(branding?.logo_url ?? null);
  const initial = adminName.charAt(0).toUpperCase();

  const handleLinkClick = () => {
    onNavigate?.();
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveStoreId(null);
      return;
    }

    const token = window.localStorage.getItem("access_token");
    if (!token) {
      setActiveStoreId(null);
      return;
    }

    try {
      const parts = token.split(".");
      if (parts.length < 2) {
        setActiveStoreId(null);
        return;
      }
      const payload = parts[1];
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const decoded = JSON.parse(atob(padded)) as { active_store_public_id?: unknown };
      const val = decoded.active_store_public_id;
      if (typeof val === "string" && val.trim()) {
        setActiveStoreId(val);
      } else if (typeof val === "number" && Number.isFinite(val)) {
        setActiveStoreId(String(val));
      } else {
        setActiveStoreId(null);
      }
    } catch {
      setActiveStoreId(null);
    }
  }, [isAuthenticated]);

  const handleCopyStoreId = async (storeId: string) => {
    if (!storeId || typeof window === "undefined") return;
    try {
      await window.navigator.clipboard.writeText(storeId);
      setCopiedStoreId(storeId);
      window.setTimeout(() => {
        setCopiedStoreId((prev) => (prev === storeId ? null : prev));
      }, 1400);
    } catch {
      // Ignore clipboard permission/runtime errors.
    }
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
          "flex shrink-0 items-center gap-2 border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
        style={{ height: "var(--header-height)" }}
      >
        {collapsed ? (
          onToggle ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="flex shrink-0 text-muted-foreground hover:text-foreground md:flex"
              aria-label={tSidebar("expandSidebar")}
            >
              <PanelRightClose className="size-5" />
            </Button>
          ) : (
            <span className="size-9 shrink-0" />
          )
        ) : (
          <>
            {resolvedLogoUrl ? (
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
              <span className="block truncate text-lg font-medium text-foreground">
                {adminName}
              </span>
              {storeType ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {storeType}
                </span>
              ) : null}
            </div>
          </>
        )}
        {!collapsed && onToggle && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggle}
            className="hidden shrink-0 text-muted-foreground hover:text-foreground md:flex"
            aria-label={tSidebar("collapseSidebar")}
          >
            <PanelRightOpen className="size-4" />
          </Button>
        )}
      </div>

      {/* Search: on mobile handled by top-bar icon; on desktop open modal */}
      {!collapsed && (
        <div className="hidden px-4 py-4 md:block">
          {/* Desktop: trigger opens search modal (mobile uses top-bar search icon) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="relative hidden h-10 w-full items-center gap-2 overflow-hidden rounded-card border-2 border-border bg-muted/50 pl-9 pr-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
            aria-label={tSidebar("openSearch")}
          >
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" />
            <span className="min-w-0 flex-1 truncate pr-0">
              {tSidebar("searchPlaceholder")}
            </span>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <kbd className="shrink-0 rounded-ui border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Ctrl+K
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
          "flex-1 space-y-0.5 overflow-y-auto px-4 pb-6",
          collapsed && "pt-2"
        )}
      >
        {!collapsed && (
          <p className="mb-2 px-1 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {tNav("navigation")}
          </p>
        )}
        <Link
          href={HOME_NAV.href}
          prefetch={shouldPrefetchLinks}
          onClick={handleLinkClick}
          className={cn(
            "flex min-h-[44px] items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors md:min-h-[40px]",
            isActive(HOME_NAV.href)
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? tNav("home") : undefined}
        >
          <HOME_NAV.icon className="size-5 shrink-0" />
          {!collapsed && (
            <span className="flex-1 truncate">{tNav("home")}</span>
          )}
        </Link>

        {MAIN_NAV_SEQUENCE.map((token) => {
          if (token === "__catalog__") {
            if (!showCatalog) return null;
            return (
              <Collapsible
                key="catalog"
                open={catalogOpen}
                onOpenChange={setCatalogOpen}
              >
                <CollapsibleTrigger
                  onClick={() => {
                    if (collapsed && onToggle) {
                      onToggle();
                      setCatalogOpen(true);
                    }
                  }}
                  className={cn(
                    "flex min-h-[44px] w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors md:min-h-[40px]",
                    catalogChildActive && !catalogOpen
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <LayoutGrid className="size-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 min-w-0 truncate text-left leading-relaxed">
                        {tNav("catalog")}
                      </span>
                      <ChevronRight
                        className={cn(
                          "size-4 shrink-0 transition-transform",
                          catalogOpen && "rotate-90"
                        )}
                      />
                    </>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {!collapsed && (
                    <div className="ml-4 mt-2 space-y-1 border-l border-border pl-3">
                      {catalogLinks.map((id) => {
                        const app = APP_CONFIG[id];
                        if (!app?.href) return null;
                        const childActive = isActive(app.href);
                        return (
                          <Link
                            key={id}
                            href={app.href}
                            prefetch={shouldPrefetchLinks}
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center justify-between rounded-ui px-2 py-2 text-sm",
                              childActive
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <span className="min-w-0 break-words leading-relaxed">
                              {tNav(app.id)}
                            </span>
                            {app.countKey &&
                              counts != null &&
                              counts[app.countKey] > 0 && (
                                <Badge
                                  className={cn(
                                    "h-5 min-w-5 rounded-full border-0 bg-primary/15 px-1.5 text-xs font-medium text-primary",
                                    numClass
                                  )}
                                >
                                  {formatCount(counts[app.countKey])}
                                </Badge>
                              )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          }
          if (!isEnabled(token) || !APP_CONFIG[token]?.href) return null;
          const app = APP_CONFIG[token];
          const Icon = app.icon;
          const active = isActive(app.href!);
          return (
            <Link
              key={token}
              href={app.href!}
              prefetch={shouldPrefetchLinks}
              onClick={handleLinkClick}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors md:min-h-[40px]",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? tNav(app.id) : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 min-w-0 truncate leading-relaxed">
                    {tNav(app.id)}
                  </span>
                  {app.countKey &&
                    counts != null &&
                    counts[app.countKey] > 0 && (
                      <Badge
                        className={cn(
                          "h-5 min-w-5 rounded-full border-0 bg-primary/15 px-1.5 text-xs font-medium text-primary",
                          numClass
                        )}
                      >
                        {formatCount(counts[app.countKey])}
                      </Badge>
                    )}
                </>
              )}
            </Link>
          );
        })}

        {/* Collapsible: More */}
        {showMore && (
        <Collapsible open={celeryOpen} onOpenChange={setCeleryOpen}>
          <CollapsibleTrigger
            onClick={() => {
              if (collapsed && onToggle) {
                onToggle();
                setCeleryOpen(true);
              }
            }}
            className={cn(
              "flex min-h-[44px] w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors md:min-h-[40px]",
              moreChildActive && !celeryOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <ListTodo className="size-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 min-w-0 truncate text-left leading-relaxed">
                  {tNav("more")}
                </span>
                {counts != null && moreLinks.some((id) => APP_CONFIG[id]?.countKey && counts[APP_CONFIG[id].countKey!] > 0) && (
                  <span className="relative mr-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-red-500">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-400/80" />
                  </span>
                )}
                <ChevronRight
                  className={cn("size-4 shrink-0 transition-transform", celeryOpen && "rotate-90")}
                />
              </>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {!collapsed && (
              <div className="ml-4 mt-2 space-y-1 border-l border-border pl-3">
                {moreLinks.map((id) => {
                  const app = APP_CONFIG[id];
                  if (!app?.href) return null;
                  const childActive = isActive(app.href);
                  return (
                    <Link
                      key={id}
                      href={app.href}
                      prefetch={shouldPrefetchLinks}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center justify-between rounded-ui px-2 py-2 text-sm",
                        childActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="min-w-0 break-words leading-relaxed">
                        {tNav(app.id)}
                      </span>
                      {app.countKey &&
                        counts != null &&
                        counts[app.countKey] > 0 && (
                          <Badge
                            className={cn(
                              "h-5 min-w-5 rounded-full border-0 bg-primary/15 px-1.5 text-xs font-medium text-primary",
                              numClass
                            )}
                          >
                            {formatCount(counts[app.countKey])}
                          </Badge>
                        )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        )}
      </nav>

      {showSystemNotification && !collapsed && (
        <div className="shrink-0 px-4 pb-3">
          <SystemNotificationBanner placement="sidebar" />
        </div>
      )}

      {/* User menu — when collapsed, keep padding tight so the avatar stays circular (w-16 minus padding). */}
      <div
        className={cn(
          "shrink-0 border-t border-border",
          collapsed ? "px-1 py-2" : "p-4"
        )}
      >
        <DropdownMenu open={userMenuOpen} onOpenChange={handleUserMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-card border-0 bg-transparent text-left transition-colors",
                "outline-none hover:bg-accent",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                collapsed ? "justify-center px-0 py-2" : "p-3",
                collapsed && "min-h-11"
              )}
              aria-label={tSidebar("userMenu")}
            >
              <span className="flex shrink-0 items-center justify-center">
                <UserAvatar publicId={userPublicId} name={ownerName} plan={userPlan} urgentSubscriptionRing={urgentSubscriptionRing} />
              </span>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ownerName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ownerEmail || tSidebar("setInSettings")}
                    </p>
                  </div>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            side="top"
            className={cn(
              "overflow-hidden rounded-card border border-border/80 p-0 shadow-lg",
              mobileUserMenuLayout
                ? // Match profile row width (w-64 sheet minus p-4); ! beats popover defaults
                  "!w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12.5rem] max-w-[min(100vw-1.5rem,14rem)]"
                : // Desktop: centered under user row; cap to trigger width (expanded) but keep usable min when collapsed
                  "w-[max(11rem,min(100vw-2rem,16.5rem,var(--radix-dropdown-menu-trigger-width)))]"
            )}
          >
            <div className="p-3 pb-2">
              <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {tSidebar("theme")}
              </p>
              <div
                className="flex gap-1 rounded-card bg-muted/60 p-1 dark:bg-muted/25"
                role="group"
                aria-label={tSidebar("theme")}
              >
                {(
                  [
                    { key: "light" as const, icon: Sun, label: tSidebar("light") },
                    { key: "dark" as const, icon: Moon, label: tSidebar("dark") },
                    { key: "system" as const, icon: Laptop, label: tSidebar("system") },
                  ] as const
                ).map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleThemeChange(key)}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-ui py-2 text-xs font-medium transition-colors",
                      theme === key
                        ? "bg-background text-primary shadow-sm ring-1 ring-primary/25 dark:bg-popover"
                        : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        theme === key ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <DropdownMenuSeparator className="my-0" />

            <div className="p-1.5">
              <p className="mb-1 px-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {tSidebar("language")}
              </p>
              {routing.locales.map((loc) => {
                const isActive = locale === loc;
                const label = loc === "en" ? tLang("switchToEnglish") : tLang("switchToBengali");
                const code = loc.toUpperCase();
                const flag = loc === "en" ? "🇺🇸" : "🇧🇩";
                return (
                  <DropdownMenuItem
                    key={loc}
                    onSelect={(event) => {
                      event.preventDefault();
                      switchUserMenuLocale(loc);
                    }}
                    className={cn(
                      "cursor-pointer rounded-ui px-2 py-2",
                      isActive && "bg-accent/80 text-primary focus:bg-accent focus:text-primary"
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="text-lg leading-none" aria-hidden>
                        {flag}
                      </span>
                      <span className="truncate font-medium">{label}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs tabular-nums text-muted-foreground",
                        isActive && "text-primary"
                      )}
                    >
                      {code}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </div>

            <DropdownMenuSeparator className="my-0" />

            <div className="p-1">
              {activeStoreId ? (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleCopyStoreId(activeStoreId);
                  }}
                  className="text-[15px] font-medium"
                >
                  {copiedStoreId === activeStoreId ? (
                    <Check
                      className="size-[1.125rem] text-emerald-600 animate-pulse"
                      aria-hidden
                    />
                  ) : (
                    <Copy className="size-[1.125rem]" aria-hidden />
                  )}
                  <span>
                    {copiedStoreId === activeStoreId
                      ? tSidebar("storeIdCopied")
                      : tSidebar("copyStoreId")}
                  </span>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild className="text-[15px] font-medium">
                <Link
                  href="/settings"
                  prefetch={shouldPrefetchLinks}
                  onClick={handleLinkClick}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Settings className="size-[1.125rem]" />
                  {tCommon("settings")}
                </Link>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="my-0" />

            <div className="p-2">
              <DropdownMenuItem
                onSelect={() => {
                  logout();
                }}
                className={cn(
                  "cursor-pointer justify-between gap-3 text-[15px] font-medium",
                  "text-red-600 hover:bg-red-500/10 hover:text-red-700 focus:bg-red-500/10 focus:text-red-700",
                  "dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300 dark:focus:bg-red-500/15 dark:focus:text-red-300",
                  "[&_svg]:text-red-600 dark:[&_svg]:text-red-400"
                )}
              >
                <span>{tSidebar("logOut")}</span>
                <LogOut className="size-[1.125rem] shrink-0" />
              </DropdownMenuItem>
            </div>
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
}

export default function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-[var(--subscription-banner-offset,0px)] z-40 hidden h-[calc(100vh-var(--subscription-banner-offset,0px))] flex-col border-r border-border bg-background transition-[width] duration-300 md:flex",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <SidebarContent
        collapsed={collapsed}
        onNavigate={onNavigate}
        onToggle={onToggle}
      />
    </aside>
  );
}

export { SidebarContent };
