"use client";

import { Star } from "lucide-react";

/**
 * A rating, drawn.
 *
 * The number is in the label rather than only in the shapes: five identical
 * icons differing in fill is not something a screen reader can read, and a
 * merchant scanning a queue should be able to search the page for "2".
 */
export function Stars({ value, label }: { value: number; label?: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={label ?? `${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={
            n <= filled
              ? "size-4 fill-amber-400 text-amber-400"
              : "size-4 text-muted-foreground/40"
          }
        />
      ))}
    </span>
  );
}
