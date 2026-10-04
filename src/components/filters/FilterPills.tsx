"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A row of one-tap choices inside a page's filter panel (owner, 2026-10-04: the buttons that used
 * to sit always on show above a list -- the delivery stage, the sort, the stock level). On a line
 * of its own at the top of the FilterBar -- unless it is the panel's only filter, when Clear may
 * follow it on the same line (`className="w-auto"`).
 */
export function FilterPills({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: string; label: ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex w-full flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value || "__all__"}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "h-9 whitespace-nowrap rounded-ui border px-3 text-sm font-medium transition",
              active
                ? "border-primary/40 bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
