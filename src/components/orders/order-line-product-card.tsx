"use client";

import { memo } from "react";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { OrderLineDisplayItem } from "@/lib/orders/editable-order-item";
import { resolveOrderLineImageUrl } from "@/lib/orders/resolve-order-line-image";
import type { ProductVariant } from "@/types";

export type LineItemEdit = {
  variant_public_id: string | null;
  quantity: number;
  price: string;
};

export type OrderLineProductCardProps = {
  item: OrderLineDisplayItem;
  editing: boolean;
  currencySymbol: string;
  edit: LineItemEdit | undefined;
  variants: ProductVariant[];
  variantsLoading: boolean;
  selectedVariant: ProductVariant | null;
  onQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVariantChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onVariantFocus: () => void;
  onRemove: () => void;
};

function OrderLineProductCardInner({
  item,
  editing,
  currencySymbol,
  edit,
  variants,
  variantsLoading,
  selectedVariant,
  onQuantityChange,
  onVariantChange,
  onVariantFocus,
  onRemove,
}: OrderLineProductCardProps) {
  const isUnavailable = item.status === "deleted" || !item.product_public_id;
  const itemDiscount =
    item.original_price != null &&
    item.original_price !== "" &&
    Number(item.original_price) > Number(item.price)
      ? (Number(item.original_price) - Number(item.price)) * item.quantity
      : 0;
  const imageUrl = resolveOrderLineImageUrl(item.product_image);

  const subtitle =
    [
      item.product_brand || null,
      item.variant_option_labels?.length
        ? item.variant_option_labels.join(" · ")
        : item.variant_sku
          ? `SKU: ${item.variant_sku}`
          : null,
      item.variant_inventory_quantity != null ? `Stock: ${item.variant_inventory_quantity}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "—";

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {editing && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 size-8 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove line item"
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      )}
      <div
        className={`flex min-w-0 w-full flex-1 flex-col items-center gap-3 ${editing ? "pt-1" : ""}`}
      >
        <div className="relative w-full shrink-0 aspect-square overflow-hidden rounded-lg bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Package className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="w-full min-w-0 flex-1 space-y-1.5 text-left">
          <p className="text-sm font-medium leading-snug text-foreground">
            {isUnavailable ? (
              "Unavailable"
            ) : (
              <ClickableText
                href={`/products/${item.product_public_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="line-clamp-2 block max-w-full text-left"
              >
                {item.product_name}
              </ClickableText>
            )}
          </p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mt-auto w-full min-w-0 space-y-2 border-t border-border/50 pt-3 text-sm">
          <div className="flex items-center justify-between gap-2 text-muted-foreground">
            <span>Qty</span>
            {editing ? (
              <Input
                type="number"
                min={1}
                value={edit?.quantity ?? item.quantity}
                onChange={onQuantityChange}
                className="h-8 w-20 py-1 text-center"
                size="sm"
              />
            ) : (
              <span className="tabular-nums text-foreground">{item.quantity}</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Price</span>
            <span className="tabular-nums font-medium text-foreground">
              {currencySymbol}
              {Number(edit?.price ?? item.price).toLocaleString()}
            </span>
          </div>
          {!editing && itemDiscount > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">
                <span className="text-muted-foreground">−{currencySymbol}</span>
                <span className="text-destructive">{itemDiscount.toLocaleString()}</span>
              </span>
            </div>
          )}
        </div>

        {editing && (
          <div className="w-full min-w-0 space-y-1.5">
            <span className="block text-left text-xs font-medium text-muted-foreground">
              Variant
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <Select
                className="h-8 min-w-0 flex-1 py-1"
                size="sm"
                value={edit?.variant_public_id ?? ""}
                onFocus={onVariantFocus}
                onChange={onVariantChange}
                disabled={variantsLoading || isUnavailable}
              >
                <option value="">{variantsLoading ? "Loading…" : "Default"}</option>
                {variants.map((v) => (
                  <option key={v.public_id} value={v.public_id}>
                    {(v.option_labels?.join(" · ") || v.sku) ?? v.public_id}
                  </option>
                ))}
              </Select>
              {selectedVariant && (
                <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                  Stock: {selectedVariant.available_quantity}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const OrderLineProductCard = memo(OrderLineProductCardInner);
