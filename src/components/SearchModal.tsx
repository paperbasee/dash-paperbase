"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const tCommon = useTranslations("common");
  const tSidebar = useTranslations("sidebar");
  const router = useRouter();
  const [query, setQuery] = useState("");
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
        const { data } = await api.get<SearchResponse>("search/", {
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
    router.push(href);
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
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-background p-0 gap-0",
            "inset-0 rounded-none border-0 shadow-none",
            "md:inset-auto md:left-1/2 md:top-[35%] md:w-full md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2",
            "md:rounded-lg md:border md:border-border md:shadow-lg",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
          onEscapeKeyDown={() => handleOpenChange(false)}
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>

          {/* Mobile: X on top row, search box full width on next row */}
          <div className="flex flex-col md:hidden">
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
                  "h-12 w-full rounded-lg pr-10 pl-4",
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
          <div className="hidden items-center gap-2 border-b border-border px-3 py-2 md:flex">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder={tSidebar("searchPlaceholder")}
              className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>

          <div className="min-h-[240px] flex-1 overflow-y-auto px-4 py-4 md:px-3">
            {!query.trim() ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                {tSidebar("searchStartHint")}
              </div>
            ) : loading ? (
              <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {tCommon("loading")}
              </div>
            ) : error ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-destructive">
                {error}
              </div>
            ) : !hasAnyResults ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                {tSidebar("searchNoResults")}
              </div>
            ) : (
              <div className="space-y-4 pb-2">
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
                          className="w-full rounded-md border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
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
                          className="w-full rounded-md border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
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
                          className="w-full rounded-md border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
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
                          className="w-full rounded-md border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/50"
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
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
