"use client";

/**
 * The foot of a dashboard list: how many rows there are, how many a page holds, and how to get
 * to another one.
 *
 * One component for every list, so no page hand-rolls its own buttons again. It draws nothing
 * when there is nothing to page and no size worth changing.
 *
 * The shape is the one the owner chose (2026-11-12): the total on the left, and on the right
 * the rows-a-page picker beside plain chevrons and page numbers, the page being read filled in.
 * No first/last buttons -- page 1 and the last page are always among the numbers, so a second
 * way to reach them only crowded the row, and crowded it worst on a phone. No rule above it
 * either (owner, 2026-11-12): the page's own spacing is the separation it needs.
 *
 * `onPrefetch` is called when a button is hovered or focused, never on its own: a page nobody
 * is about to open costs the database nothing.
 */

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";

import { Select } from "@/components/ui/select";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { PAGE_SIZES, pageButtons, type PageSize } from "@/lib/paging";
import { cn } from "@/lib/utils";

type PagerProps = {
  /** The page being read, as the server served it. */
  page: number;
  /** How many pages there are, at the current size. */
  pages: number;
  /** How many rows match, across every page. */
  count: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
  onPrefetch?: (page: number) => void;
  className?: string;
};

/** Every button in the row is this size, so the numbers and the chevrons line up. */
const SPOT = "inline-flex size-8 items-center justify-center rounded-full text-sm";

const STEP_CLASS = cn(
  SPOT,
  "text-muted-foreground transition-colors duration-[180ms] ease-in-out",
  "hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30",
  "disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
);

export function Pager({
  page,
  pages,
  count,
  pageSize,
  onPage,
  onPageSize,
  onPrefetch,
  className,
}: PagerProps) {
  const locale = useLocale();
  const t = useTranslations("pager");
  const numClass = numberTextClass(locale);
  const digits = (value: number) => toLocaleDigits(String(value), locale);

  if (pages <= 1 && count <= PAGE_SIZES[0]) return null;

  const step = (target: number, label: string, icon: React.ReactNode, enabled: boolean) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!enabled}
      onClick={() => onPage(target)}
      onMouseEnter={enabled ? () => onPrefetch?.(target) : undefined}
      onFocus={enabled ? () => onPrefetch?.(target) : undefined}
      className={STEP_CLASS}
    >
      {icon}
    </button>
  );

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        {t("totalLabel")}{" "}
        <span className={cn("font-semibold text-foreground", numClass)}>{digits(count)}</span>
      </p>

      {/* `ml-auto` sends the picker and the buttons to the right end. On a phone the picker
          finishes the first line with the total and the full-width button row wraps under it,
          centred; from sm up the three sit on one line. */}
      <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        {t("perPage")}
        <Select
          value={String(pageSize)}
          onChange={(event) => onPageSize(Number(event.target.value) as PageSize)}
          className={cn("h-8 w-[72px] py-0 pl-2.5 text-sm", numClass)}
          aria-label={t("perPageAria")}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {digits(size)}
            </option>
          ))}
        </Select>
      </label>

      <div className="flex w-full items-center justify-center gap-0.5 sm:w-auto">
        {step(page - 1, t("previous"), <CaretLeft className="size-4" aria-hidden />, page > 1)}

        {pageButtons(page, pages).map((one, index) =>
          one === "gap" ? (
            <span key={`gap-${index}`} aria-hidden className={cn(SPOT, "text-muted-foreground")}>
              …
            </span>
          ) : (
            <button
              key={one}
              type="button"
              aria-current={one === page ? "page" : undefined}
              aria-label={t("goToPage", { page: digits(one) })}
              onClick={() => onPage(one)}
              onMouseEnter={() => onPrefetch?.(one)}
              onFocus={() => onPrefetch?.(one)}
              className={cn(
                SPOT,
                "transition-colors duration-[180ms] ease-in-out",
                one === page
                  ? "bg-foreground font-semibold text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                numClass
              )}
            >
              {digits(one)}
            </button>
          )
        )}

        {step(page + 1, t("next"), <CaretRight className="size-4" aria-hidden />, page < pages)}
      </div>
    </nav>
  );
}
