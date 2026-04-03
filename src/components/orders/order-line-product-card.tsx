"use client";

import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
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
  unit_price: string;
};

export type OrderLineProductCardProps = {
  item: OrderLineDisplayItem;
  editing: boolean;
  currencySymbol: string;
  edit: LineItemEdit | undefined;
  variants: ProductVariant[];
  variantsLoading: boolean;
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
  onQuantityChange,
  onVariantChange,
  onVariantFocus,
  onRemove,
}: OrderLineProductCardProps) {
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const isUnavailable =
    item.is_unavailable === true || item.status === "deleted" || !item.product_public_id;
  const snapshotName = item.product_name_snapshot || item.product_name || "Product";
  const snapshotVariant = item.variant_snapshot || null;
  const qtyShown = edit?.quantity ?? item.quantity;
  const snapshotUnit = Number(item.unit_price_snapshot ?? item.unit_price ?? 0);
  const catalogUnitRaw =
    "catalog_unit_price" in item && item.catalog_unit_price != null && item.catalog_unit_price !== ""
      ? Number(item.catalog_unit_price)
      : NaN;
  const catalogListRaw =
    "catalog_list_price" in item && item.catalog_list_price != null && item.catalog_list_price !== ""
      ? Number(item.catalog_list_price)
      : NaN;
  const variantIdForPrice =
    (editing ? edit?.variant_public_id : null) ?? item.variant_public_id ?? null;
  const selectedVar =
    variantIdForPrice && variants.length
      ? variants.find((v) => v.public_id === variantIdForPrice)
      : null;
  const fromVariantEffective =
    selectedVar?.effective_price != null && selectedVar.effective_price !== ""
      ? Number(selectedVar.effective_price)
      : NaN;

  const showLiveCatalogView = !editing && !Number.isNaN(catalogUnitRaw);

  /** Actual sell / charged unit (catalog or snapshot). */
  let sellUnit: number;
  if (editing) {
    if (!Number.isNaN(fromVariantEffective)) {
      sellUnit = fromVariantEffective;
    } else if (variants.length === 0 && !Number.isNaN(catalogUnitRaw)) {
      sellUnit = catalogUnitRaw;
    } else if (!variantsLoading && !Number.isNaN(catalogUnitRaw)) {
      sellUnit = catalogUnitRaw;
    } else {
      sellUnit = Number(edit?.unit_price ?? snapshotUnit);
    }
  } else if (showLiveCatalogView) {
    sellUnit = catalogUnitRaw;
  } else {
    sellUnit = snapshotUnit;
  }

  /** List / undiscounted unit shown as “Unit Price” (MSRP or snapshot original). */
  const snapshotOrig =
    "original_price" in item && item.original_price != null && item.original_price !== ""
      ? Number(item.original_price)
      : NaN;
  let displayListUnit: number;
  if (!Number.isNaN(catalogListRaw)) {
    displayListUnit = catalogListRaw;
  } else if (!Number.isNaN(snapshotOrig)) {
    displayListUnit = snapshotOrig;
  } else {
    displayListUnit = sellUnit;
  }

  const lineSub = "line_subtotal" in item && item.line_subtotal != null ? Number(item.line_subtotal) : null;
  const lineTot = "line_total" in item && item.line_total != null ? Number(item.line_total) : null;
  let itemDiscount = 0;
  if (
    !editing &&
    !Number.isNaN(catalogListRaw) &&
    !Number.isNaN(catalogUnitRaw) &&
    catalogListRaw > catalogUnitRaw
  ) {
    itemDiscount = (catalogListRaw - catalogUnitRaw) * qtyShown;
  } else if (lineSub != null && lineTot != null && lineSub > lineTot) {
    itemDiscount = lineSub - lineTot;
  } else {
    const orig =
      item.original_price != null && item.original_price !== "" ? Number(item.original_price) : 0;
    if (orig > sellUnit) itemDiscount = (orig - sellUnit) * qtyShown;
  }
  const imageUrl = resolveOrderLineImageUrl(item.product_image);

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (item.product_brand) parts.push(item.product_brand);
    if (item.variant_option_labels?.length) {
      parts.push(item.variant_option_labels.join(" · "));
    } else if (snapshotVariant) {
      parts.push(snapshotVariant);
    } else if (item.variant_sku) {
      parts.push(`${tPages("orderDetailSkuPrefix")}: ${item.variant_sku}`);
    }
    if (item.variant_inventory_quantity != null) {
      parts.push(`${tPages("orderNewStock")}: ${item.variant_inventory_quantity}`);
    }
    return parts.length ? parts.join(" · ") : "—";
  }, [item, snapshotVariant, tPages]);

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex min-w-0 w-full flex-1 flex-col items-center gap-3">
        <div className="relative w-full shrink-0 aspect-square overflow-hidden rounded-lg bg-muted">
          {editing && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-1.5 top-1.5 z-10 h-8 w-8 shrink-0 rounded-full shadow-md"
              aria-label={tPages("orderNewRemoveItemAria")}
              onClick={onRemove}
            >
              <X className="size-4 stroke-[2.5]" />
            </Button>
          )}
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
              snapshotName
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
          {isUnavailable ? <p className="text-xs font-medium text-destructive">Product data corrupted</p> : null}
        </div>

        <div className="mt-auto w-full min-w-0 space-y-2 border-t border-border/50 pt-3 text-sm">
          <div className="flex items-center justify-between gap-2 text-muted-foreground">
            <span>{tPages("orderNewColQty")}</span>
            {editing && !isUnavailable ? (
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
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-muted-foreground">{tPages("orderDetailUnitPrice")}</span>
            <span className="tabular-nums font-medium text-foreground">
              {currencySymbol}
              {displayListUnit.toLocaleString()}
            </span>
          </div>
          {!editing && itemDiscount > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{tPages("orderNewDiscount")}</span>
              <span className="tabular-nums font-medium text-foreground">
                −{currencySymbol}
                {itemDiscount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {editing && !isUnavailable && (
          <div className="w-full min-w-0 space-y-1.5">
            <span className="block text-left text-xs font-medium text-muted-foreground">
              {tPages("orderNewColVariant")}
            </span>
            <div className="w-full min-w-0">
              <Select
                className="h-8 w-full min-w-0 py-1"
                size="sm"
                value={edit?.variant_public_id ?? ""}
                onFocus={onVariantFocus}
                onChange={onVariantChange}
                disabled={variantsLoading || isUnavailable}
              >
                <option value="">
                  {variantsLoading ? tCommon("loading") : tPages("orderNewVariantDefault")}
                </option>
                {variants.map((v) => (
                  <option key={v.public_id} value={v.public_id}>
                    {(v.option_labels?.join(" · ") || v.sku) ?? v.public_id}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const OrderLineProductCard = memo(OrderLineProductCardInner);
