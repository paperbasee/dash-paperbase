import type { OrderItem } from "@/types";

/** Order line shape while editing on the order detail page (includes optimistic new rows). */
export type EditableOrderItem = {
  key: string;
  public_id: string | null;
  product_public_id: string | null;
  product_name: string;
  product_brand?: string;
  product_image: string | null;
  status?: OrderItem["status"];
  is_unavailable?: boolean;
  variant_public_id: string | null;
  quantity: number;
  unit_price: string;
  original_price?: string | null;
  line_subtotal?: string;
  line_total?: string;
  catalog_unit_price?: string | null;
  catalog_list_price?: string | null;
  variant_option_labels?: string[];
  variant_sku?: string | null;
  variant_inventory_quantity?: number | null;
  isNew: boolean;
};

export type OrderLineDisplayItem = OrderItem | EditableOrderItem;

export function isEditableOrderLine(item: OrderLineDisplayItem): item is EditableOrderItem {
  return "key" in item && typeof (item as EditableOrderItem).key === "string";
}

export function orderLineListKey(item: OrderLineDisplayItem, index: number): string {
  if (isEditableOrderLine(item)) {
    return item.key ?? item.public_id ?? `order-item-${index}`;
  }
  return item.public_id ?? `order-item-${index}`;
}

export function orderLineEditKey(item: OrderLineDisplayItem): string {
  if (isEditableOrderLine(item)) {
    return item.public_id ?? item.key;
  }
  return item.public_id;
}

export function orderLineRemoveKey(item: OrderLineDisplayItem): string {
  if (isEditableOrderLine(item)) {
    return item.key;
  }
  return item.public_id;
}
