"use client";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronRight,
  LayoutGrid,
  Lock,
  Megaphone,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryStatusDot } from "@/components/inventory/InventoryStatusDot";
import type { ComponentType } from "react";
import type { NavCounts } from "@/config/apps";
import { APP_CONFIG } from "@/config/apps";
import type { InventoryStatusLevel } from "@/lib/inventory-status";

export default function AppSidebarNav({
  collapsed,
  pathname,
  shouldPrefetchLinks,
  onNavigate,
  tNavLabel,
  tCatalogLabel,
  tMarketingLabel,
  tMoreLabel,
  tAppLabel,
  hasFeature,
  counts,
  formatCount,
  numClass,
  homeHref,
  homeIcon: HomeIcon,
  catalogLinks,
  showCatalog,
  catalogChildActive,
  catalogOpen,
  setCatalogOpen,
  marketingLinks,
  showMarketing,
  marketingChildActive,
  marketingOpen,
  setMarketingOpen,
  showMore,
  moreLinks,
  moreChildActive,
  celeryOpen,
  setCeleryOpen,
  inventoryNavStatus,
  mainNavSequence,
  onExpandIfCollapsed,
}: {
  collapsed: boolean;
  pathname: string;
  shouldPrefetchLinks: boolean;
  onNavigate: () => void;
  tNavLabel: string;
  tCatalogLabel: string;
  tMarketingLabel: string;
  tMoreLabel: string;
  tAppLabel: (id: string) => string;
  hasFeature: (key: string) => boolean;
  counts: NavCounts | null;
  formatCount: (n: number) => string;
  numClass: string;
  homeHref: string;
  homeIcon: ComponentType<{ className?: string }>;
  catalogLinks: readonly string[];
  showCatalog: boolean;
  catalogChildActive: boolean;
  catalogOpen: boolean;
  setCatalogOpen: (open: boolean) => void;
  marketingLinks: readonly string[];
  showMarketing: boolean;
  marketingChildActive: boolean;
  marketingOpen: boolean;
  setMarketingOpen: (open: boolean) => void;
  showMore: boolean;
  moreLinks: readonly string[];
  moreChildActive: boolean;
  celeryOpen: boolean;
  setCeleryOpen: (open: boolean) => void;
  inventoryNavStatus: InventoryStatusLevel;
  mainNavSequence: readonly (string)[]; // tokens like __catalog__
  onExpandIfCollapsed?: () => void;
}) {
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {!collapsed && (
        <p className="mb-2 px-1 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tNavLabel}
        </p>
      )}

      <Link
        href={homeHref}
        prefetch={shouldPrefetchLinks}
        onClick={onNavigate}
        className={cn(
          "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
          isActive(homeHref)
            ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
            : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? tAppLabel("home") : undefined}
      >
        <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0 flex-1")}>
          <HomeIcon className="size-5 shrink-0" />
          {!collapsed && <span className="truncate">{tAppLabel("home")}</span>}
        </span>
      </Link>

      {mainNavSequence.map((token) => {
        if (token === "__catalog__") {
          if (!showCatalog) return null;
          return (
            <Collapsible key="catalog" open={catalogOpen} onOpenChange={setCatalogOpen}>
              <CollapsibleTrigger
                onClick={() => {
                  if (collapsed) {
                    setCatalogOpen(true);
                    onExpandIfCollapsed?.();
                  }
                }}
                className={cn(
                  "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                  catalogChildActive && !catalogOpen
                    ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90",
                  collapsed && "justify-center px-2"
                )}
              >
                <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0 flex-1")}>
                  <LayoutGrid className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{tCatalogLabel}</span>}
                </span>
                {!collapsed && (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 transition-transform text-muted-foreground dark:text-white/50",
                        catalogOpen && "rotate-90"
                      )}
                    />
                  </span>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                {!collapsed && (
                  <div className="ml-4 mt-2 space-y-1 border-l border-border pl-3">
                    {catalogLinks.map((id) => {
                      const app = APP_CONFIG[id as keyof typeof APP_CONFIG];
                      if (!app?.href) return null;
                      const childActive = isActive(app.href);
                      return (
                        <Link
                          key={id}
                          href={app.href}
                          prefetch={shouldPrefetchLinks}
                          onClick={onNavigate}
                          className={cn(
                            "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                            childActive
                              ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90"
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{tAppLabel(app.id)}</span>
                          {app.countKey && counts != null && counts[app.countKey] > 0 && (
                            <Badge
                              className={cn(
                                "h-5 min-w-5 rounded-full border-0 bg-muted px-1.5 text-xs font-medium text-muted-foreground dark:bg-white/10 dark:text-white/55",
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

        if (token === "__marketing__") {
          if (!showMarketing) return null;
          return (
            <Collapsible key="marketing" open={marketingOpen} onOpenChange={setMarketingOpen}>
              <CollapsibleTrigger
                onClick={() => {
                  if (collapsed) {
                    setMarketingOpen(true);
                    onExpandIfCollapsed?.();
                  }
                }}
                className={cn(
                  "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                  marketingChildActive && !marketingOpen
                    ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90",
                  collapsed && "justify-center px-2"
                )}
              >
                <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0 flex-1")}>
                  <Megaphone className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{tMarketingLabel}</span>}
                </span>
                {!collapsed && (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 transition-transform text-muted-foreground dark:text-white/50",
                        marketingOpen && "rotate-90"
                      )}
                    />
                  </span>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                {!collapsed && (
                  <div className="ml-4 mt-2 space-y-1 border-l border-border pl-3">
                    {marketingLinks.map((id) => {
                      const app = APP_CONFIG[id as keyof typeof APP_CONFIG];
                      if (!app?.href) return null;
                      const childActive = isActive(app.href);
                      return (
                        <Link
                          key={id}
                          href={app.href}
                          prefetch={shouldPrefetchLinks}
                          onClick={onNavigate}
                          className={cn(
                            "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                            childActive
                              ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90"
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{tAppLabel(app.id)}</span>
                          {app.countKey && counts != null && counts[app.countKey] > 0 && (
                            <Badge
                              className={cn(
                                "h-5 min-w-5 rounded-full border-0 bg-muted px-1.5 text-xs font-medium text-muted-foreground dark:bg-white/10 dark:text-white/55",
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

        // regular app
        const app = APP_CONFIG[token as keyof typeof APP_CONFIG];
        if (!app?.href) return null;
        const Icon = app.icon;
        const active = isActive(app.href);

        return (
          <Link
            key={token}
            href={app.href}
            prefetch={shouldPrefetchLinks}
            onClick={onNavigate}
            className={cn(
              "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
              active
                ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? tAppLabel(app.id) : undefined}
          >
            <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0 flex-1")}>
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{tAppLabel(app.id)}</span>}
            </span>
            {!collapsed && (
              <span className="flex shrink-0 items-center gap-2">
                {token === "analytics" && !hasFeature("advanced_analytics") && (
                  <Lock className="size-3.5 shrink-0 text-muted-foreground ml-auto" />
                )}
                {token === "inventory" && (
                  <>
                    <InventoryStatusDot status={inventoryNavStatus} />
                    {inventoryNavStatus !== "none" && (
                      <span className="sr-only">
                        {inventoryNavStatus === "red"
                          ? tAppLabel("inventoryStatusStockOut")
                          : tAppLabel("inventoryStatusLowStock")}
                      </span>
                    )}
                  </>
                )}
                {app.countKey && counts != null && counts[app.countKey] > 0 && (
                  <Badge
                    className={cn(
                      "h-5 min-w-5 rounded-full border-0 bg-muted px-1.5 text-xs font-medium text-muted-foreground dark:bg-white/10 dark:text-white/55",
                      numClass
                    )}
                  >
                    {formatCount(counts[app.countKey])}
                  </Badge>
                )}
              </span>
            )}
          </Link>
        );
      })}

      {showMore && (
        <Collapsible open={celeryOpen} onOpenChange={setCeleryOpen}>
          <CollapsibleTrigger
            onClick={() => {
              if (collapsed) {
                setCeleryOpen(true);
                onExpandIfCollapsed?.();
              }
            }}
            className={cn(
              "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
              moreChildActive && !celeryOpen
                ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90",
              collapsed && "justify-center px-2"
            )}
          >
            <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0 flex-1")}>
              <ListTodo className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{tMoreLabel}</span>}
            </span>
            {!collapsed && (
              <span className="flex shrink-0 items-center gap-1.5">
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 transition-transform text-muted-foreground dark:text-white/50",
                    celeryOpen && "rotate-90"
                  )}
                />
              </span>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {!collapsed && (
              <div className="ml-4 mt-2 space-y-1 border-l border-border pl-3">
                {moreLinks.map((id) => {
                  const app = APP_CONFIG[id as keyof typeof APP_CONFIG];
                  if (!app?.href) return null;
                  const childActive = isActive(app.href);
                  return (
                    <Link
                      key={id}
                      href={app.href}
                      prefetch={shouldPrefetchLinks}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                        childActive
                          ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{tAppLabel(app.id)}</span>
                      {app.countKey && counts != null && counts[app.countKey] > 0 && (
                        <Badge
                          className={cn(
                            "h-5 min-w-5 rounded-full border-0 bg-muted px-1.5 text-xs font-medium text-muted-foreground dark:bg-white/10 dark:text-white/55",
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
    </>
  );
}

