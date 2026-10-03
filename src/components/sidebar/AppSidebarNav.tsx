"use client";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronRight,
  LayoutGrid,
  Lock,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavHrefActive } from "@/lib/navigation/nav-active";
import { InventoryStatusDot } from "@/components/inventory/InventoryStatusDot";
import type { ComponentType, ReactNode } from "react";
import type { NavCounts } from "@/config/apps";
import { APP_CONFIG, NAV_GROUP_LABEL_KEYS } from "@/config/apps";
import type { InventoryStatusLevel } from "@/lib/inventory-status";

/**
 * The right-hand end of a nav row: an indicator, then a chevron's width.
 *
 * Every row builds it the same way, which is the only reason the numbers line
 * up. They did not before: a group row ended with a chevron and a plain row
 * did not, so Blog's badge sat about 22px right of Sales' and the Catalog
 * children's sat further right again -- close enough to read as sloppy rather
 * than deliberate.
 *
 * The indicator box is a fixed 20px whether it holds a badge, the inventory
 * dot, or nothing, so a dot lines up with the numbers above and below it.
 * `chevron` is passed by rows that have one; the rest get the same width as
 * empty space.
 */
function NavRowEnd({
  children,
  chevron,
  before,
}: {
  children?: React.ReactNode;
  chevron?: React.ReactNode;
  before?: React.ReactNode;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {before}
      <span className="flex h-5 min-w-5 items-center justify-center">{children}</span>
      {chevron ?? <span aria-hidden className="size-4 shrink-0" />}
    </span>
  );
}

export default function AppSidebarNav({
  collapsed,
  pathname,
  shouldPrefetchLinks,
  onNavigate,
  tNavLabel,
  quickCreate,
  tCatalogLabel,
  tMoreLabel,
  tAppLabel,
  hasFeature,
  counts,
  formatCount,
  numClass,
  homeHref,
  homeIcon: HomeIcon,
  catalogLinks,
  navChildren,
  openChildren,
  onSetChildrenOpen,
  showCatalog,
  catalogChildActive,
  catalogOpen,
  setCatalogOpen,
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
  /** The Add new menu, drawn under the label (owner, 2026-10-04). */
  quickCreate?: ReactNode;
  tCatalogLabel: string;
  tMoreLabel: string;
  tAppLabel: (id: string) => string;
  hasFeature: (key: string) => boolean;
  counts: NavCounts | null;
  formatCount: (n: number) => string;
  numClass: string;
  homeHref: string;
  homeIcon: ComponentType<{ className?: string }>;
  catalogLinks: readonly string[];
  /** Parent app id -> its sidebar children. The parent still navigates. */
  navChildren: Record<string, readonly string[]>;
  openChildren: Set<string>;
  onSetChildrenOpen: (appId: string, open: boolean) => void;
  showCatalog: boolean;
  catalogChildActive: boolean;
  catalogOpen: boolean;
  setCatalogOpen: (open: boolean) => void;
  showMore: boolean;
  moreLinks: readonly string[];
  moreChildActive: boolean;
  celeryOpen: boolean;
  setCeleryOpen: (open: boolean) => void;
  inventoryNavStatus: InventoryStatusLevel;
  mainNavSequence: readonly (string)[]; // tokens like __catalog__
  onExpandIfCollapsed?: () => void;
}) {
  const isActive = (href: string) => isNavHrefActive(pathname, href);

  /**
   * One rule for every group in this sidebar.
   *
   * Expanded, a click on the row toggles its tree, as a disclosure should.
   * Collapsed, the tree is not on screen to be closed, so a click on the rail
   * means "show me this" and never "hide it": the tree is SET open and the
   * sidebar opens with it.
   *
   * It lives here, on the Collapsible, rather than in the trigger's `onClick`.
   * Both fire for one click -- the trigger's handler first, then Radix's own
   * toggle -- so a group that handled the rail in `onClick` acted twice on one
   * press. Toggling in each cancelled out and Sales and Customers never opened
   * from the rail at all; setting `true` in each left Catalog and More closing
   * themselves whenever they were already open.
   */
  const openFromRow = (set: (open: boolean) => void) => (next: boolean) => {
    if (collapsed) {
      set(true);
      onExpandIfCollapsed?.();
      return;
    }
    set(next);
  };

  return (
    <>
      {!collapsed && (
        <p className="mb-2 px-1 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tNavLabel}
        </p>
      )}
      {quickCreate}

      <DeferredNavLink
        href={homeHref}
        onNavigate={onNavigate}
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
      </DeferredNavLink>

      {mainNavSequence.map((token) => {
        if (token === "__catalog__") {
          if (!showCatalog) return null;
          return (
            <Collapsible key="catalog" open={catalogOpen} onOpenChange={openFromRow(setCatalogOpen)}>
              <CollapsibleTrigger
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
                        <DeferredNavLink
                          key={id}
                          href={app.href}
                          onNavigate={onNavigate}
                          className={cn(
                            "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                            childActive
                              ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90"
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{tAppLabel(app.id)}</span>
                          <NavRowEnd>
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
                          </NavRowEnd>
                        </DeferredNavLink>
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

        const link = (
          <DeferredNavLink
            key={token}
            href={app.href}
            onNavigate={onNavigate}
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
              /*
               * The right-hand column, built to the same measurements as a
               * group row's: `gap-1.5`, one indicator box, then the width of a
               * chevron.
               *
               * A plain row has no chevron, so without that last spacer its
               * badge sat about 22px further right than Sales' and Shoppers'
               * did -- close enough to look accidental, which is worse than
               * obviously different. The spacer is what puts every number in
               * one column.
               */
              <NavRowEnd
                before={
                  token === "analytics" && !hasFeature("advanced_analytics") && !hasFeature("basic_analytics") ? (
                    <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : null
                }
              >
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
              </NavRowEnd>
            )}
          </DeferredNavLink>
        );

        const children = navChildren?.[token] ?? [];
        if (!children.length) return link;

        // A group, behaving exactly like `Catalog`: the row opens the tree and
        // the shopper -- merchant -- picks from it. The parent's own page is
        // the first child, the way Products sits under Catalog, so nothing
        // becomes unreachable by the row no longer navigating.
        //
        // The owner asked for this over a row that navigated with a chevron
        // beside it: one behaviour for every group in the sidebar beats two
        // that look alike and do different things.
        const open = openChildren.has(token);
        const childActive = children.some((id) => {
          const href = APP_CONFIG[id as keyof typeof APP_CONFIG]?.href;
          return href ? isActive(href) : false;
        });

        return (
          <Collapsible
            key={token}
            open={open}
            onOpenChange={openFromRow((next) => onSetChildrenOpen(token, next))}
          >
            <CollapsibleTrigger
              title={collapsed ? tAppLabel(NAV_GROUP_LABEL_KEYS[token] ?? app.id) : undefined}
              className={cn(
                "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                childActive && !open
                  ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90",
                collapsed && "justify-center px-2"
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-2",
                  collapsed ? "justify-center" : "min-w-0 flex-1"
                )}
              >
                <Icon className="size-5 shrink-0" />
                {/* The group's own name, not the parent page's -- otherwise
                    the same word appears twice, one indented under the other. */}
                {!collapsed && (
                  <span className="truncate">
                    {tAppLabel(NAV_GROUP_LABEL_KEYS[token] ?? app.id)}
                  </span>
                )}
              </span>
              {!collapsed && (
              <NavRowEnd
                chevron={
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 transition-transform text-muted-foreground dark:text-white/50",
                      open && "rotate-90"
                    )}
                  />
                }
              >
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
              </NavRowEnd>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              {!collapsed && (
              <div className="ml-4 mt-2 space-y-1 border-l border-border pl-3">
                {children.map((childId) => {
                  const child = APP_CONFIG[childId as keyof typeof APP_CONFIG];
                  if (!child?.href) return null;
                  const active = isActive(child.href);
                  return (
                    <DeferredNavLink
                      key={childId}
                      href={child.href}
                      onNavigate={onNavigate}
                      className={cn(
                        "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                        active
                          ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{tAppLabel(child.id)}</span>
                    </DeferredNavLink>
                  );
                })}
              </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {showMore && (
        <Collapsible open={celeryOpen} onOpenChange={openFromRow(setCeleryOpen)}>
          <CollapsibleTrigger
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
                    <DeferredNavLink
                      key={id}
                      href={app.href}
                      onNavigate={onNavigate}
                      className={cn(
                        "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xs text-sm font-normal w-full transition-colors",
                        childActive
                          ? "bg-accent text-foreground dark:bg-white/[0.12] dark:text-white/95"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.07] dark:hover:text-white/90"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{tAppLabel(app.id)}</span>
                      <NavRowEnd>
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
                      </NavRowEnd>
                    </DeferredNavLink>
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

