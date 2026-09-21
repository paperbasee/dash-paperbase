"use client";

// What shoppers want, ranked.
//
// The only view in the dashboard that says what people want rather than what
// they bought. A merchant reads the top of it and restocks, promotes, or
// discounts — so it is a short list, not a browsable catalogue.
//
// Read-only. There is nothing here to edit; the product itself is one click
// away on the other tab.

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { numberTextClass } from "@/lib/number-font";
import { notify } from "@/notifications";
import { useMostWishedForQuery } from "@/hooks/useMostWishedForQuery";
import type { MostWishedForProduct } from "@/types";

function priceDisplay(product: MostWishedForProduct): string {
  const number = Number(product.price ?? "0");
  if (Number.isNaN(number)) return String(product.price ?? "");
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function MostWishedForTab() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");

  const { data, isLoading, isError, error } = useMostWishedForQuery();

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleMostWishedForFailedToLoad"),
      fallbackMessage: tPages("toastDescMostWishedForFailedToLoad"),
    });
  }, [isError, error, tPages]);

  const products = data ?? [];

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">{tCommon("loading")}</p>;
  }

  if (!isError && products.length === 0) {
    return (
      <div className="rounded-card border border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
        {tPages("mostWishedForEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {tPages("mostWishedForIntro")}
        </p>
        {/* Said plainly, because the number is easy to read as the whole shop
            and it is not. A shopper who saves without signing in keeps that
            list in their own browser, so it never reaches this count -- and
            that is a permanent property of the design, not a gap to be fixed
            later. */}
        <p className="text-xs text-muted-foreground/80">
          {tPages("mostWishedForScope")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-card-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="th">{tPages("mostWishedForColRank")}</th>
              <th className="th">{tPages("productsListColProduct")}</th>
              <th className="th">{tPages("mostWishedForColSavedBy")}</th>
              <th className="th">{tPages("productsListColPrice")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {products.map((product, index) => (
              <ClickableTableRow
                key={product.public_id}
                href={`/products/${product.public_id}`}
                aria-label={product.name}
              >
                <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {product.name}
                  {product.is_active ? null : (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {tPages("mostWishedForHidden")}
                    </span>
                  )}
                </td>
                <td className={`px-4 py-3 text-foreground ${numClass}`}>
                  {product.saved_by}
                </td>
                <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                  {priceDisplay(product)}
                </td>
              </ClickableTableRow>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {tPages("mostWishedForCountsPeople")}
      </p>
    </div>
  );
}
