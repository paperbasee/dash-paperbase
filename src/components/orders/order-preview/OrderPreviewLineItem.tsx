"use client";

import { Package } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ClickableText } from "@/components/ui/clickable-text";
import { numberTextClass } from "@/lib/number-font";
import { resolveOrderLineImageUrl } from "@/lib/orders/resolve-order-line-image";
import type { OrderItem } from "@/types";
import { cn } from "@/lib/utils";

type OrderPreviewLineItemProps = {
  item: OrderItem;
  currencySymbol: string;
};

export function OrderPreviewLineItem({ item, currencySymbol }: OrderPreviewLineItemProps) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");

  const isUnavailable =
    item.is_unavailable === true || item.status === "deleted" || !item.product_public_id;
  const name = item.product_name_snapshot || item.product_name || "Product";
  const qty = item.quantity;
  const unitPrice = Number(item.unit_price_snapshot ?? item.unit_price ?? 0);
  const lineTotal = Number(item.line_total ?? unitPrice * qty);
  const imageUrl = resolveOrderLineImageUrl(item.product_image);

  const subtitleParts: string[] = [];
  if (item.variant_option_labels?.length) {
    subtitleParts.push(item.variant_option_labels.join(" · "));
  } else if (item.variant_snapshot) {
    subtitleParts.push(item.variant_snapshot);
  } else if (item.variant_sku) {
    subtitleParts.push(`${tPages("orderDetailSkuPrefix")}: ${item.variant_sku}`);
  }

  return (
    <li className="flex w-full min-w-0 gap-2.5 rounded-card border border-border/70 bg-card p-2.5 md:p-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-card bg-muted md:size-14">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-5 text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        {isUnavailable ? (
          <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{name}</p>
        ) : (
          <ClickableText
            href={`/products/${item.product_public_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 block max-w-full text-left text-sm leading-snug"
          >
            {item.product_name || name}
          </ClickableText>
        )}
        {subtitleParts.length > 0 ? (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {subtitleParts.join(" · ")}
          </p>
        ) : null}
        {isUnavailable ? (
          <p className="text-xs font-medium text-destructive">Product data corrupted</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className={cn("text-muted-foreground", numClass)}>
            {tPages("orderNewColQty")}: {qty}
          </span>
          <span className={cn("font-medium text-foreground", numClass)}>
            {currencySymbol}
            {lineTotal.toLocaleString()}
          </span>
        </div>
      </div>
    </li>
  );
}
