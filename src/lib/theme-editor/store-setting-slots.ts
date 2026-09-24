/**
 * Places in this editor that write a SHOP SETTING rather than the theme document.
 *
 * Every other place on this canvas edits the theme: the choice lands in a
 * draft, the merchant reads it in the preview beside them, and nothing reaches
 * a shopper until Save to store. This kind does not. It writes a row the shop
 * already had before the editor existed, it writes it the moment it is clicked,
 * and Save to store has nothing to do with it.
 *
 * **There is exactly one so far.** The checkout's form -- short or long -- is
 * `StorefrontCheckoutSettings.customer_form_variant`, which Settings ->
 * Checkout wrote from long before this screen was drawn. Copying it into the
 * theme document would have meant two rows for one fact, and the first merchant
 * to change one and not the other would have found out.
 *
 * On 2026-09-24 the owner moved it here outright: Settings -> Checkout no
 * longer offers it, it is chosen on the canvas that draws the form, and this is
 * now the only screen that writes it. A merchant designing their checkout
 * should not have to leave the page they are designing to decide how many boxes
 * it has.
 *
 * A place listed here must SAY it saves straight away, in its hint, or a
 * merchant will expect the draft to hold it.
 */
import type { SlotPageKey } from "./slot-catalogue";

export type StoreSettingSlot = {
  /** The field on `store/checkout-settings/` this place writes. */
  setting: "customer_form_variant";
  /** What the API calls each of the place's values, where the names differ. */
  values?: Record<string, string>;
};

export const STORE_SETTING_SLOTS: Partial<
  Record<SlotPageKey, Record<string, StoreSettingSlot>>
> = {
  // The editor's two variants are spelled exactly as the API spells them, so
  // no mapping is needed -- and keeping them that way is worth more than the
  // mapping would be.
  checkout: { form: { setting: "customer_form_variant" } },
};

export function storeSettingFor(page: SlotPageKey, key: string): StoreSettingSlot | undefined {
  return STORE_SETTING_SLOTS[page]?.[key];
}

/** What this place's value is called on the wire. */
export function storeSettingValue(slot: StoreSettingSlot, value: string): string {
  return slot.values?.[value] ?? value;
}
