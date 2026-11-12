"use client";

/**
 * The foot of a dashboard list: where you are, how to get elsewhere, and how many rows a page
 * holds.
 *
 * One component for every list, so no page hand-rolls its own buttons again. It draws nothing
 * when there is nothing to page and no size worth changing.
 *
 * `onPrefetch` is called when a button is hovered or focused, never on its own: a page nobody
 * is about to open costs the database nothing.
 */

import {
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
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

//: Only the double arrows carry this: on a phone the row has no width for them, and previous
//: and next with the page numbers reach everywhere they do.
const WIDE_ONLY = "hidden sm:inline-flex";

const STEP_CLASS =
  "inline-flex items-center justify-center rounded-ui border border-border-subtle px-2 py-1.5 sm:px-2.5 " +
  "text-foreground transition-[background-color,border-color] duration-[180ms] ease-in-out " +
  "hover:border-border-hover hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

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

  const firstRow = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, count);

  const step = (
    target: number,
    label: string,
    icon: React.ReactNode,
    enabled: boolean,
    extra?: string,
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!enabled}
      onClick={() => onPage(target)}
      onMouseEnter={enabled ? () => onPrefetch?.(target) : undefined}
      onFocus={enabled ? () => onPrefetch?.(target) : undefined}
      className={cn(STEP_CLASS, extra)}
    >
      {icon}
    </button>
  );

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* On a phone these two share the first line; from sm up `contents` dissolves the
          wrapper and they take their own places in the row. */}
      <div className="flex items-center justify-between gap-3 sm:contents">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("perPage")}
          <Select
            value={String(pageSize)}
            onChange={(event) => onPageSize(Number(event.target.value) as PageSize)}
            className={cn("w-[84px]", numClass)}
            aria-label={t("perPageAria")}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {digits(size)}
              </option>
            ))}
          </Select>
        </label>

        <p className={cn("text-sm text-muted-foreground", numClass)}>
          {t("range", { from: digits(firstRow), to: digits(lastRow), count: digits(count) })}
        </p>
      </div>

      {/* Centred under the line above on a phone; from sm up it ends the row, and `ml-auto`
          keeps it against the right edge on the narrow widths where it wraps. */}
      <div className="flex items-center justify-center gap-1 sm:ml-auto">
        {step(1, t("first"), <CaretDoubleLeft className="size-4" aria-hidden />, page > 1, WIDE_ONLY)}
        {step(page - 1, t("previous"), <CaretLeft className="size-4" aria-hidden />, page > 1)}

        {pageButtons(page, pages).map((one, index) =>
          one === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden
              className="px-1 text-sm text-muted-foreground"
            >
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
                "min-w-8 rounded-ui border px-1.5 py-1.5 text-sm sm:min-w-9 sm:px-2",
                "transition-[background-color,border-color] duration-[180ms] ease-in-out",
                one === page
                  ? "border-border-hover bg-muted font-semibold text-foreground"
                  : "border-border-subtle text-foreground hover:border-border-hover hover:bg-muted",
                numClass,
              )}
            >
              {digits(one)}
            </button>
          ),
        )}

        {step(page + 1, t("next"), <CaretRight className="size-4" aria-hidden />, page < pages)}
        {step(
          pages,
          t("last"),
          <CaretDoubleRight className="size-4" aria-hidden />,
          page < pages,
          WIDE_ONLY,
        )}
      </div>

    </nav>
  );
}
