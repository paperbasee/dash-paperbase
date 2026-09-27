/**
 * Places in this editor that write a SHOP SETTING rather than the theme document.
 *
 * Every other place in this editor edits the theme: the choice lands in a
 * draft, and nothing reaches a shopper until Save to store. This kind writes a
 * row the shop already had before the editor existed -- so it is not in the
 * draft and `documents.ts` knows nothing about it.
 *
 * **It is still saved by Save to store and by nothing else** (owner,
 * 2026-09-24, reversing the same day's first answer: it wrote itself the moment
 * it was clicked, and that was a second save a merchant had not asked for).
 * `SlotEditor` holds the choice until then and sends it with the rest. The
 * consequence to know: a pending choice lives in the screen, so it does not
 * survive a reload the way a draft does.
 *
 * **Two so far.** The shop's social links (2026-09-26) are the other: typed in the footer's Social
 * links place (`SocialLinksFields`) beside the marks they draw, saved on `admin/branding/` where
 * Settings used to write them, and no longer offered there. They are four boxes rather than a
 * choice, so `SlotEditor` holds them itself (`pendingLinks`) instead of through this list.
 *
 * The checkout's form -- short or long -- is
 * `StorefrontCheckoutSettings.customer_form_variant`, which Settings ->
 * Checkout wrote from long before this screen was drawn. Copying it into the
 * theme document would have meant two rows for one fact, and the first merchant
 * to change one and not the other would have found out.
 *
 * On 2026-09-24 the owner moved it here outright: Settings -> Checkout no
 * longer offers it, it is chosen in the editor beside the form, and this is
 * now the only screen that writes it. A merchant designing their checkout
 * should not have to leave the page they are designing to decide how many boxes
 * it has.
 *
 * The checkout's district -- typed, or picked from the list --
 * (`StorefrontCheckoutSettings.district_input`, 2026-09-27) joined it the same
 * way: the order itself is held to that choice, so it belongs to the shop, and
 * it is chosen beside the district it changes.
 *
 * A place listed here must SAY in its hint when it is saved. It looks like every
 * other tile and it is not one, and the difference only shows on the day
 * something goes wrong with one half and not the other.
 */
import type { CheckoutSettings } from "@/hooks/useCheckoutSettingsQuery";

import type { SlotPageKey } from "./slot-catalogue";

export type StoreSettingSlot = {
  /** The field on `store/checkout-settings/` this place writes. */
  setting: "customer_form_variant" | "district_input";
  /** What the API calls each of the place's values, where the names differ. */
  values?: Record<string, string>;
};

export const STORE_SETTING_SLOTS: Partial<
  Record<SlotPageKey, Record<string, StoreSettingSlot>>
> = {
  // The editor's two variants are spelled exactly as the API spells them, so
  // no mapping is needed -- and keeping them that way is worth more than the
  // mapping would be.
  checkout: {
    form: { setting: "customer_form_variant" },
    district: { setting: "district_input" },
  },
};

export function storeSettingFor(page: SlotPageKey, key: string): StoreSettingSlot | undefined {
  return STORE_SETTING_SLOTS[page]?.[key];
}

/** What this place's value is called on the wire. */
export function storeSettingValue(slot: StoreSettingSlot, value: string): string {
  return slot.values?.[value] ?? value;
}

/**
 * Each shop-setting place's choice as the shop has it now -- what the tiles show until the
 * merchant picks otherwise, and what they go back to when a pending choice is given up.
 */
export function choicesFromShop(settings: CheckoutSettings | undefined): {
  page: SlotPageKey;
  key: string;
  value: string;
}[] {
  if (!settings) return [];
  return Object.entries(STORE_SETTING_SLOTS).flatMap(([page, places]) =>
    Object.entries(places ?? {}).map(([key, slot]) => {
      const wire = String(settings[slot.setting]);
      const value = Object.entries(slot.values ?? {}).find(([, sent]) => sent === wire)?.[0] ?? wire;
      return { page: page as SlotPageKey, key, value };
    }),
  );
}
