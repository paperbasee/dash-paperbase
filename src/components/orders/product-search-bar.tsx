"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

export type ProductSearchBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  searchingProducts: boolean;
  showProductResults: boolean;
  productResults: Product[];
  currencySymbol: string;
  onSelectProduct: (product: Product) => void;
  onDismissResults: () => void;
};

export function ProductSearchBar({
  value,
  onValueChange,
  searchingProducts,
  showProductResults,
  productResults,
  currencySymbol,
  onSelectProduct,
  onDismissResults,
}: ProductSearchBarProps) {
  const tPages = useTranslations("pages");
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onValueChange("");
      onDismissResults();
    }
    setOpen(nextOpen);
  };

  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    handleOpenChange(false);
  };

  return (
    <div className="flex items-center justify-start px-4 py-3 sm:px-6">
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            className="h-10 rounded-card border border-border/70 bg-foreground px-5 text-background hover:bg-foreground/90"
          >
            Add product
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0"
            )}
          />
          <Dialog.Content
            className={cn(
              "fixed z-50 flex min-h-0 flex-col overflow-hidden bg-background p-0 gap-0",
              "inset-0 rounded-none border-0 shadow-none max-h-[100dvh]",
              "md:inset-auto md:left-1/2 md:top-1/2 md:h-[min(560px,85vh)] md:w-full md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2",
              "md:rounded-card md:border md:border-border md:shadow-lg",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            )}
          >
            <Dialog.Title className="sr-only">{tPages("orderDetailAddProductSearchLabel")}</Dialog.Title>

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
                  placeholder={tPages("orderDetailSearchActiveProductsPlaceholder")}
                  className={cn(
                    "h-12 w-full rounded-card pr-10 pl-4",
                    "border-2 border-border bg-background focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  )}
                  autoFocus
                  value={value}
                  onChange={(e) => onValueChange(e.target.value)}
                  autoComplete="off"
                />
                <Search className="absolute right-7 top-1/2 size-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 border-b border-border px-3 py-2 md:flex">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder={tPages("orderDetailSearchActiveProductsPlaceholder")}
                className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                autoComplete="off"
              />
              <kbd className="shrink-0 rounded-ui border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                esc
              </kbd>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-3">
              {!value.trim() ? (
                <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                  {tPages("orderDetailAddProductSearchLabel")}
                </div>
              ) : showProductResults && productResults.length > 0 ? (
                <div
                  className="overflow-hidden rounded-card border border-border bg-popover shadow-sm"
                  aria-label={tPages("orderDetailProductSearchResultsAria")}
                >
                  {productResults.map((product) => (
                    <button
                      key={product.public_id}
                      type="button"
                      className="flex w-full min-w-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/60"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <span className="truncate text-foreground">{product.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {currencySymbol}
                        {Number(product.price).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              ) : searchingProducts ? (
                <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                  {tPages("orderDetailSearchingProducts")}
                </div>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                  No products found.
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {searchingProducts && (
        <p className="mt-2 text-xs text-muted-foreground">{tPages("orderDetailSearchingProducts")}</p>
      )}
    </div>
  );
}
