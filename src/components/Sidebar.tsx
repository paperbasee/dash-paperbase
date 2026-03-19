"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Birdhouse,
  Bell,
  ShoppingCart,
  Heart,
  Users,
  ListTodo,
  ChevronDown,
  ChevronRight,
  PanelRightOpen,
  PanelRightClose,
  Search,
  LogOut,
  Settings,
  Store,
  Plus,
  LayoutGrid,
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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { useBranding, defaultBranding } from "@/context/BrandingContext";
import { useStoreLimit } from "@/hooks/useStoreLimit";
import { useSearchModal } from "@/context/SearchModalContext";
import { useNavCounts } from "@/hooks/useNavCounts";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import {
  APP_CONFIG,
  CATALOG_SUB_APP_IDS,
  MORE_APP_IDS,
} from "@/config/apps";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/** Top-level nav order; `__catalog__` is the Products / catalog group. */
const MAIN_NAV_SEQUENCE = [
  "orders",
  "__catalog__",
  "customers",
  "cta",
  "carts",
  "wishlist",
  "banners",
  "analytics",
] as const;

function logoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

const HOME_NAV = {
  href: "/",
  label: "Home",
  icon: Birdhouse,
  countKey: null as keyof NavCounts | null,
};

export interface NavCounts {
  orders: number;
  products: number;
  notifications: number;
  carts: number;
  wishlist: number;
  categories: number;
  contacts: number;
}

function SidebarContent({
  collapsed,
  onNavigate,
  onToggle,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const { logout, isAuthenticated } = useAuth();
  const { branding } = useBranding();
  const { canAddStore } = useStoreLimit(isAuthenticated);
  const { setOpen: setSearchOpen } = useSearchModal();
  const { counts, formatCount } = useNavCounts();
  const { isEnabled } = useEnabledApps();
  const [usersOpen, setUsersOpen] = useState(false);
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
  const [celeryOpen, setCeleryOpen] = useState(false);
  const [storesOpen, setStoresOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("core-theme");
    let initial: "light" | "dark" | "system" = "light";
    if (stored === "light" || stored === "dark" || stored === "system") {
      initial = stored;
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      initial = "system";
    }
    setTheme(initial);
    const root = document.documentElement;
    const applied =
      initial === "system"
        ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : initial;
    root.setAttribute("data-theme", applied);
  }, []);

  const handleThemeChange = (next: "light" | "dark" | "system") => {
    setTheme(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem("core-theme", next);
    const root = document.documentElement;
    const applied =
      next === "system"
        ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next;
    root.setAttribute("data-theme", applied);
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

  return (
    <>
      {/* Header: when collapsed show only toggle button; when expanded show logo + name + subtitle + toggle */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4"
        style={{ height: "var(--header-height)" }}
      >
        {collapsed ? (
          onToggle ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="flex shrink-0 text-muted-foreground hover:text-foreground md:flex"
              aria-label="Expand sidebar"
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
            aria-label="Collapse sidebar"
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
            className="relative hidden h-10 w-full items-center gap-2 overflow-hidden rounded-lg border-2 border-border bg-muted/50 pl-9 pr-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
            aria-label="Open search"
          >
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" />
            <span className="min-w-0 flex-1 truncate pr-0">Search apps and more</span>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <kbd className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Ctrl+K
                  </kbd>
                </TooltipTrigger>
                <TooltipContent side="bottom">Search shortcut</TooltipContent>
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
            Navigation
          </p>
        )}
        <Link
          href={HOME_NAV.href}
          onClick={handleLinkClick}
          className={cn(
            "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:min-h-[40px]",
            isActive(HOME_NAV.href)
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? HOME_NAV.label : undefined}
        >
          <HOME_NAV.icon className="size-5 shrink-0" />
          {!collapsed && <span className="flex-1 truncate">{HOME_NAV.label}</span>}
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
                    "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:min-h-[40px]",
                    catalogChildActive && !catalogOpen
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <LayoutGrid className="size-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">Catalog</span>
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
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center justify-between rounded-md px-2 py-2 text-sm",
                              childActive
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <span>{app.label}</span>
                            {app.countKey &&
                              counts != null &&
                              counts[app.countKey] > 0 && (
                                <Badge className="h-5 min-w-5 rounded-full border-0 bg-primary/15 px-1.5 text-xs font-medium text-primary">
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
              onClick={handleLinkClick}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:min-h-[40px]",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? app.label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{app.label}</span>
                  {app.countKey &&
                    counts != null &&
                    counts[app.countKey] > 0 && (
                      <Badge
                        className="h-5 min-w-5 rounded-full border-0 bg-primary/15 px-1.5 text-xs font-medium text-primary"
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
              "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:min-h-[40px]",
              collapsed && "justify-center px-2"
            )}
          >
            <ListTodo className="size-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">More</span>
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
                  return (
                    <Link
                      key={id}
                      href={app.href}
                      onClick={handleLinkClick}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <span>{app.label}</span>
                      {app.countKey &&
                        counts != null &&
                        counts[app.countKey] > 0 && (
                          <Badge className="h-5 min-w-5 rounded-full border-0 bg-primary/15 px-1.5 text-xs font-medium text-primary">
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

      {/* User menu (no avatar) */}
      <div className="shrink-0 border-t border-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent",
                collapsed && "justify-center"
              )}
              aria-label="User menu"
            >
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ownerName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ownerEmail || "Set in Settings"}
                    </p>
                  </div>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </>
              )}
              {collapsed && <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56" side="top">
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setStoresOpen((prev) => !prev);
              }}
            >
              <Store className="size-4" />
              <span className="flex-1">Stores</span>
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  storesOpen && "rotate-90"
                )}
              />
            </DropdownMenuItem>
            {storesOpen && (
              <>
                <DropdownMenuItem disabled>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Current store
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 bg-emerald-400"
                      style={{ borderRadius: "999px" }}
                    />
                    <span className="truncate">{adminName || "Store"}</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canAddStore === false ? (
                  <DropdownMenuItem disabled>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Plus className="size-3.5" />
                      <span>Add another store</span>
                    </span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/onboarding?add=1"
                      onClick={handleLinkClick}
                      className="flex cursor-pointer items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="size-3.5" />
                      <span>Add another store</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                onClick={handleLinkClick}
                className="flex cursor-pointer items-center gap-2"
              >
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 pb-1">
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => handleThemeChange("light")}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium",
                    theme === "light"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange("dark")}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium",
                    theme === "dark"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange("system")}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium",
                    theme === "system"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  System
                </button>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={logout}
              className="cursor-pointer"
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
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
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-background transition-[width] duration-300 md:flex",
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
