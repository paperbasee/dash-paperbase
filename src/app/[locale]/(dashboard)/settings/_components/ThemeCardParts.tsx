"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { categoryLabel } from "@/lib/theme-editor/theme-groups";

/*
 * The pieces the current-theme card is drawn with. They lived beside the
 * theme gallery, which went on 2026-09-25: the shop has one theme (owner:
 * "there is only one thing, so no need to keep the themes").
 */

const sk = "rounded-sm bg-muted-foreground/15";

/** A page outline: header, banner, product row. Real theme pictures come with the designs. */
export function ThemeThumbnail({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none flex aspect-[16/10] flex-col gap-1.5 overflow-hidden rounded-card border border-border bg-muted/40 p-2",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("h-1.5 w-8", sk)} />
        <div className="flex gap-1">
          <div className={cn("h-1.5 w-3", sk)} />
          <div className={cn("h-1.5 w-3", sk)} />
          <div className={cn("h-1.5 w-3", sk)} />
        </div>
      </div>
      <div className={cn("h-1/3 w-full", sk)} />
      <div className="grid flex-1 grid-cols-3 gap-1.5">
        <div className={sk} />
        <div className={sk} />
        <div className={sk} />
      </div>
    </div>
  );
}

const pillTone = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  draft: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  plain: "border-border bg-muted/50 text-muted-foreground",
} as const;

export function ThemePill({ tone, children }: { tone: keyof typeof pillTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        pillTone[tone],
      )}
    >
      {children}
    </span>
  );
}

/** A category's label in the viewer's language. */
export function useCategoryLabel() {
  const t = useTranslations("settings.customization");
  return (category: string | null) => {
    const label = categoryLabel(category);
    return "key" in label ? t(label.key) : label.text;
  };
}
