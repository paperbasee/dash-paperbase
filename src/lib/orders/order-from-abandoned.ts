import type { AbandonedCheckout } from "@/types";

import { splitShippingAddressForForm } from "./shipping-address-parts";

/**
 * What the New order form starts from when an abandoned checkout is converted
 * (owner, 2026-09-27): the shopper's details as they typed them, and their
 * basket at the prices they were shown. The merchant checks both on the phone
 * before saving, and picks the delivery area -- a checkout that stopped short
 * has none on record.
 */
export function orderFromAbandoned(row: AbandonedCheckout) {
  const { village, thana } = splitShippingAddressForForm(row.shipping_address, row.district);
  return {
    form: {
      shipping_name: row.name,
      phone: row.phone,
      email: row.email,
      village,
      thana,
      district: row.district,
    },
    // A line whose product has since gone has nothing to order.
    items: row.items
      .filter((item) => item.product_public_id)
      .map((item) => ({
        product_public_id: item.product_public_id,
        product_name: item.name,
        product_image: null as string | null,
        variant_public_id: item.variant_public_id,
        quantity: item.quantity,
        unit_price: String(item.unit_price ?? "0"),
      })),
  };
}
