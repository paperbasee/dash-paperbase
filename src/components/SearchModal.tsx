"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { normalizeNavigationHref } from "@/lib/navigation/normalize-navigation-href";
import { Clock, Loader2, Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCanShowApp } from "@/hooks/useCanShowApp";
import { usePermissions } from "@/context/PermissionsContext";
import { useVisibleSettingsSections } from "@/app/[locale]/(dashboard)/settings/useVisibleSettingsSections";
import { findPlaces, placeLabel, visiblePlaces, type SearchPlace } from "@/lib/search/places";
import {
  EMPTY_RESULTS,
  SERVER_KINDS,
  clearRecentSearches,
  hrefFor,
  normalizeResults,
  readRecentSearches,
  rememberSearch,
  type SearchResponse,
  type SearchRow,
  type ServerKind,
} from "@/lib/search/results";
import api, { currentShop } from "@/lib/api";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Pages, settings and actions shown at most, above what the server finds. */
const PLACES_SHOWN = 6;
const ACTIONS_SHOWN = 3;

/** Each server kind's heading: its own page's name where it has one. */
const KIND_TITLE: Record<ServerKind, string> = {
  products: "sidebar.searchProducts",
  orders: "sidebar.searchOrders",
  customers: "sidebar.searchCustomers",
  categories: "nav.categories",
  brands: "nav.brands",
  coupons: "nav.coupons",
  posts: "nav.blog",
  reviews: "nav.reviews",
  tickets: "sidebar.searchTickets",
  team: "sidebar.searchTeam",
};

/** The dashboard's own places this person may open (lib/search/places.ts), found as they type. */
function usePlaceMatches(query: string): {
  places: SearchPlace[];
  actions: SearchPlace[];
  labelOf: (p: SearchPlace) => string;
} {
  const t = useTranslations();
  const canShowApp = useCanShowApp();
  const { has } = usePermissions();
  const sections = useVisibleSettingsSections();
  const visible = useMemo(
    () => visiblePlaces({ canShowApp, has, settingsSections: new Set(sections.map((row) => row.id)) }),
    [canShowApp, has, sections],
  );
  const labelOf = useMemo(() => (place: SearchPlace) => placeLabel(place, (key) => t(key)), [t]);
  return useMemo(
    () => ({
      places: findPlaces(query, visible.filter((p) => p.group === "places"), labelOf, PLACES_SHOWN),
      actions: findPlaces(query, visible.filter((p) => p.group === "actions"), labelOf, ACTIONS_SHOWN),
      labelOf,
    }),
    [query, visible, labelOf],
  );
}


export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const tSidebar = useTranslations("sidebar");
  const navigate = useDeferredNavigate();
  const [query, setQuery] = useState("");
  const placeMatches = usePlaceMatches(query);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS);
  const [error, setError] = useState<string>("");
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setRecent(readRecentSearches(currentShop()));
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setError("");
      setLoading(false);
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open) return;

    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      return;
    }

    let cancelled = false;
    const runSearch = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get<SearchResponse>("admin/search/", {
          params: { query: trimmed },
        });
        if (cancelled) return;
        setResults(normalizeResults(data));
      } catch {
        if (cancelled) return;
        setResults(EMPTY_RESULTS);
        setError(tSidebar("searchLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, tSidebar]);

  /** Everything shown, as one list the arrow keys walk: places, actions, then what the server found. */
  const rows = useMemo<SearchRow[]>(() => {
    const out: SearchRow[] = [];
    for (const [group, matches] of [
      ["sidebar.searchPlaces", placeMatches.places],
      ["sidebar.searchActions", placeMatches.actions],
    ] as const) {
      for (const place of matches) {
        out.push({ key: place.id, group, href: place.href, title: placeMatches.labelOf(place) });
      }
    }
    // Not while the server is still looking (that would be the last answer), nor after it failed.
    if (!loading && !error) {
      for (const kind of SERVER_KINDS) {
        for (const item of results[kind]) {
          out.push({
            key: `${kind}:${item.public_id}`,
            group: KIND_TITLE[kind],
            href: hrefFor(kind, item),
            title: item.title,
            subtitle: item.subtitle,
          });
        }
      }
    }
    return out;
  }, [placeMatches, results, loading, error]);

  // A new list starts at its first line.
  useEffect(() => setActive(0), [rows]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const goTo = (href: string) => {
    setRecent(rememberSearch(currentShop(), query));
    navigate(normalizeNavigationHref(href));
    onOpenChange(false);
  };

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return; // a Bangla keyboard still composing a letter
    if (event.key === "ArrowDown" && rows.length > 0) {
      event.preventDefault();
      setActive((index) => (index + 1) % rows.length);
    } else if (event.key === "ArrowUp" && rows.length > 0) {
      event.preventDefault();
      setActive((index) => (index - 1 + rows.length) % rows.length);
    } else if (event.key === "Enter" && rows[active]) {
      event.preventDefault();
      goTo(rows[active].href);
    }
  }

  const inputProps = {
    placeholder: tSidebar("searchPlaceholder"),
    autoFocus: true,
    value: query,
    onChange: (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
    onKeyDown,
    role: "combobox" as const,
    "aria-expanded": rows.length > 0,
    "aria-controls": "dashboard-search-results",
    "aria-activedescendant": rows[active] ? `dashboard-search-row-${active}` : undefined,
  };

  const centred = "flex min-h-[220px] items-center justify-center text-sm";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            "fixed z-50 flex min-h-0 flex-col overflow-hidden bg-background p-0 gap-0",
            "inset-0 border-0 shadow-none max-h-[100dvh]",
            /* Desktop: viewport-centered; fixed height prevents size/position shift while results load */
            "md:inset-auto md:left-1/2 md:top-1/2 md:h-[min(560px,85vh)] md:w-full md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2",
            "md:rounded-xs md:border md:border-border md:shadow-lg",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
          aria-describedby={undefined}
          onEscapeKeyDown={() => handleOpenChange(false)}
        >
          <Dialog.Title className="sr-only">{tCommon("search")}</Dialog.Title>

          {/* Mobile: X on top row, search box full width on next row */}
          <div className="flex shrink-0 flex-col md:hidden">
            <div className="flex justify-end p-4 pb-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label={tCommon("closeSearch")}
                onClick={() => handleOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="relative px-4 pt-3 pb-4">
              <Input
                {...inputProps}
                className={cn(
                  "h-12 w-full rounded-xs pr-10 pl-4",
                  "border-2 border-border bg-background focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                )}
              />
              <Search className="absolute right-7 top-1/2 size-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Desktop: single row with icon left, input, esc */}
          <div className="hidden shrink-0 items-center gap-2 border-b border-border px-3 py-2 md:flex">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              {...inputProps}
              className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <kbd className="shrink-0 rounded-xs border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>

          <div ref={listRef} id="dashboard-search-results" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-3">
            {!query.trim() ? (
              recent.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {tSidebar("searchRecent")}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearRecentSearches(currentShop());
                        setRecent([]);
                      }}
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {tSidebar("searchClearRecent")}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recent.map((earlier) => (
                      <button
                        key={earlier}
                        type="button"
                        onClick={() => setQuery(earlier)}
                        className="flex w-full items-center gap-2 rounded-xs px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted/50"
                      >
                        <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{earlier}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={cn(centred, "text-muted-foreground")}>{tSidebar("searchStartHint")}</div>
              )
            ) : (
              <div className="pb-2" role="listbox">
                {rows.map((row, index) => (
                  <div key={row.key}>
                    {index === 0 || rows[index - 1].group !== row.group ? (
                      <p
                        className={cn(
                          "mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          index > 0 && "mt-4"
                        )}
                      >
                        {t(row.group)}
                      </p>
                    ) : null}
                    <button
                      id={`dashboard-search-row-${index}`}
                      data-row={index}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      onClick={() => goTo(row.href)}
                      onMouseMove={() => setActive(index)}
                      className={cn(
                        "mb-1 w-full rounded-xs border border-transparent px-3 py-2 text-left transition",
                        index === active ? "border-border bg-muted/60" : "hover:bg-muted/50"
                      )}
                    >
                      <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                      {row.subtitle ? <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p> : null}
                    </button>
                  </div>
                ))}
                {loading ? (
                  <div
                    className={cn(
                      "flex items-center justify-center gap-2 text-sm text-muted-foreground",
                      rows.length > 0 ? "py-4" : "min-h-[220px]"
                    )}
                  >
                    <Loader2 className="size-4 animate-spin" />
                    {tCommon("loading")}
                  </div>
                ) : error ? (
                  <div
                    className={cn(
                      "flex items-center justify-center text-sm text-destructive",
                      rows.length > 0 ? "py-4" : "min-h-[220px]"
                    )}
                  >
                    {error}
                  </div>
                ) : rows.length === 0 ? (
                  <div className={cn(centred, "text-muted-foreground")}>{tSidebar("searchNoResults")}</div>
                ) : null}
              </div>
            )}
          </div>

          {rows.length > 0 ? (
            <p className="hidden shrink-0 border-t border-border px-3 py-2 text-[11px] text-muted-foreground md:block">
              {tSidebar("searchKeysHint")}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
