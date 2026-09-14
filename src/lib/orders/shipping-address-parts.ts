/**
 * BD-style address: road/village + thana + district.
 *
 * Order.shipping_address is stored in one of three shapes, and the district always has its own
 * field (Order.district):
 * - storefront minimal checkout: "thana"
 * - storefront extended checkout: "address line, thana" (the address line may contain commas)
 * - dashboard (create and edit): "village, thana, district"
 */

/** Compose stored shipping_address for API (village, thana, district). */
export function joinVillageThanaDistrict(
  village: string,
  thana: string,
  district: string,
): string {
  return [village.trim(), thana.trim(), district.trim()].filter(Boolean).join(", ");
}

/** @deprecated Use joinVillageThanaDistrict; kept for any external imports. */
export function joinVillageThana(village: string, thana: string): string {
  return [village.trim(), thana.trim()].filter(Boolean).join(", ");
}

/**
 * Parse shipping_address back into form fields, using the order's own district.
 * A trailing part equal to the district (dashboard shape) is dropped; the district is never
 * guessed from position. The last remaining part is the thana, everything before it the village.
 */
export function splitShippingAddressForForm(
  shipping_address: string,
  district?: string | null,
): { village: string; thana: string } {
  const parts = (shipping_address || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const d = (district ?? "").trim().toLowerCase();
  if (d && parts.length >= 2 && parts[parts.length - 1].toLowerCase() === d) {
    parts.pop();
  }
  if (parts.length === 0) return { village: "", thana: "" };
  return { village: parts.slice(0, -1).join(", "), thana: parts[parts.length - 1] };
}

export type OrderEditAddressFields = { village: string; thana: string; district: string };

/**
 * What the order editor sends for the address. An untouched address is not sent at all, so an
 * items-only save never rewrites what the storefront stored (and never blocks on a field the
 * storefront did not collect). A changed address needs a thana and a district.
 */
export function orderEditAddressPatch(
  form: OrderEditAddressFields,
  initial: OrderEditAddressFields | null,
): {
  error: "thana" | "district" | null;
  patch: { shipping_address: string; district: string } | null;
} {
  const village = form.village.trim();
  const thana = form.thana.trim();
  const district = form.district.trim();
  if (
    initial &&
    village === initial.village.trim() &&
    thana === initial.thana.trim() &&
    district === initial.district.trim()
  ) {
    return { error: null, patch: null };
  }
  if (!thana) return { error: "thana", patch: null };
  if (!district) return { error: "district", patch: null };
  return {
    error: null,
    patch: { shipping_address: joinVillageThanaDistrict(village, thana, district), district },
  };
}
