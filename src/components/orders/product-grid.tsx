"use client";

import type { ReactNode } from "react";

export type ProductGridProps = {
  children: ReactNode;
  emptyLabel?: string;
  hasItems: boolean;
};

export function ProductGrid({
  children,
  emptyLabel = "No line items.",
  hasItems,
}: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hasItems ? (
        children
      ) : (
        <div className="col-span-full rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
