"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { normalizeNavigationHref } from "@/lib/navigation/normalize-navigation-href";
import { Loader2, Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCanShowApp } from "@/hooks/useCanShowApp";
import { usePermissions } from "@/context/PermissionsContext";
import { useVisibleSettingsSections } from "@/app/[locale]/(dashboard)/settings/useVisibleSettingsSections";
import { findPlaces, placeLabel, visiblePlaces, type SearchPlace } from "@/lib/search/places";
import api from "@/lib/api";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchItem {
  public_id: string;
  title: string;
  subtitle?: string;
}

interface SearchResponse {
  products: SearchItem[];
  orders: SearchItem[];
  customers: SearchItem[];
  tickets: SearchItem[];
}

const EMPTY_RESULTS: SearchResponse = {
  products: [],
  orders: [],
  customers: [],
  tickets: [],
};

/** Pages, settings and actions shown at most, above what the server finds. */
const PLACES_SHOWN = 6;
const ACTIONS_SHOWN = 3;

/** The dashboard's own places this person may open (lib/search/places.ts), found as they type. */
function usePlaceMatches(query: string): { places: SearchPlace[]; actions: SearchPlace[]; labelOf: (p: SearchPlace) => string } {
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
  const tCommon = useTranslations("common");
  const tSidebar = useTranslations("sidebar");
  const [query, setQuery] = useState("");
  const placeMatches = usePlaceMatches(query);
  const hasPlaces = placeMatches.places.length > 0 || placeMatches.actions.length > 0;
  const navigate = useDeferredNavigate();
  const debouncedQuery = useDebouncedValue(query, 300);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS);
  const [error, setError] = useState<string>("");

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
        setResults({
          products: data.products ?? [],
          orders: data.orders ?? [],
          customers: data.customers ?? [],
          tickets: data.tickets ?? [],
        });
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

  const hasAnyResults = useMemo(() => {
    return (
      results.products.length > 0 ||
      results.orders.length > 0 ||
      results.customers.length > 0 ||
      results.tickets.length > 0
    );
  }, [results]);

  const goTo = (href: string) => {
    navigate(normalizeNavigationHref(href));
    onOpenChange(false);
  };

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
          <Dialog.Title className="sr-only">Search</Dialog.Title>

          {/* Mobile: X on top row, search box full width on next row */}
          <div className="flex shrink-0 flex-col md:hidden">
            <div className="flex justify-end p-4 pb-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close search"
                onClick={() => handleOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="relative px-4 pt-3 pb-4">
              <Input
                placeholder={tSidebar("searchPlaceholder")}
                className={cn(
                  "h-12 w-full rounded-xs pr-10 pl-4",
                  "border-2 border-border bg-background focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                )}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Search className="absolute right-7 top-1/2 size-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Desktop: single row with icon left, input, esc */}
          <div className="hidden shrink-0 items-center gap-2 border-b border-border px-3 py-2 md:flex">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder={tSidebar("searchPlaceholder")}
              className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd className="shrink-0 rounded-xs border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-3">
            {!query.trim() ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                {tSidebar("searchStartHint")}
              </div>
            ) : (
              <div className="space-y-4 pb-2">
                {(
                  [
                    ["searchPlaces", placeMatches.places],
                    ["searchActions", placeMatches.actions],
                  ] as const
                ).map(([titleKey, matches]) =>
                  matches.length > 0 ? (
                    <div key={titleKey}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {tSidebar(titleKey)}
                      </p>
                      <div className="space-y-1">
                        {matches.map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => goTo(place.href)}
                            className="w-full rounded-xs border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
                          >
                            <p className="truncate text-sm font-medium text-foreground">{placeMatches.labelOf(place)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
                {loading ? (
                  <div
                    className={cn(
                      "flex items-center justify-center gap-2 text-sm text-muted-foreground",
                      hasPlaces ? "py-4" : "min-h-[220px]"
                    )}
                  >
                    <Loader2 className="size-4 animate-spin" />
                    {tCommon("loading")}
                  </div>
                ) : error ? (
                  <div
                    className={cn(
                      "flex items-center justify-center text-sm text-destructive",
                      hasPlaces ? "py-4" : "min-h-[220px]"
                    )}
                  >
                    {error}
                  </div>
                ) : !hasAnyResults && !hasPlaces ? (
                  <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                    {tSidebar("searchNoResults")}
                  </div>
                ) : null}
                {/* What the server found -- not while it is still looking, nor after it failed. */}
                {!loading && !error ? (
                  <>
                    {results.products.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {tSidebar("searchProducts")}
                        </p>
                        <div className="space-y-1">
                          {results.products.map((item) => (
                            <button
                              key={item.public_id}
                              type="button"
                              onClick={() => goTo(`/products/${item.public_id}`)}
                              className="w-full rounded-xs border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
                            >
                              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                              {item.subtitle ? (
                                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {results.orders.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {tSidebar("searchOrders")}
                        </p>
                        <div className="space-y-1">
                          {results.orders.map((item) => (
                            <button
                              key={item.public_id}
                              type="button"
                              onClick={() => goTo(`/orders/${item.public_id}`)}
                              className="w-full rounded-xs border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
                            >
                              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                              {item.subtitle ? (
                                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {results.customers.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {tSidebar("searchCustomers")}
                        </p>
                        <div className="space-y-1">
                          {results.customers.map((item) => (
                            <button
                              key={item.public_id}
                              type="button"
                              onClick={() => goTo(`/customers/${item.public_id}`)}
                              className="w-full rounded-xs border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
                            >
                              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                              {item.subtitle ? (
                                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {results.tickets.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {tSidebar("searchTickets")}
                        </p>
                        <div className="space-y-1">
                          {results.tickets.map((item) => (
                            <button
                              key={item.public_id}
                              type="button"
                              onClick={() => goTo(`/support-tickets/${item.public_id}`)}
                              className="w-full rounded-xs border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
                            >
                              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                              {item.subtitle ? (
                                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
