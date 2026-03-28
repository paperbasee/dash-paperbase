"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProductResults) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onDismissResults();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismissResults();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showProductResults, onDismissResults]);

  return (
    <div ref={rootRef} className="space-y-2 px-4 pb-4 pt-2 sm:px-6">
      <label className="sr-only" htmlFor="order-add-product-search">
        Search products to add
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="order-add-product-search"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Search active products..."
          className="h-10 rounded-lg border-border/80 bg-background pl-9 pr-3 shadow-sm"
          autoComplete="off"
        />
        {showProductResults && productResults.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-popover shadow-md [scrollbar-width:thin]"
            aria-label="Product search results"
          >
            {productResults.map((product) => (
              <button
                key={product.public_id}
                type="button"
                className="flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                onClick={() => onSelectProduct(product)}
              >
                <span className="truncate text-foreground">{product.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {currencySymbol}
                  {Number(product.price).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {searchingProducts && (
        <p className="text-xs text-muted-foreground">Searching products...</p>
      )}
    </div>
  );
}
