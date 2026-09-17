import { promotionsHref } from "@/app/[locale]/(dashboard)/settings/sections/promotions/promotionTabs";

/*
 * Sections whose words and pictures are not theme settings at all.
 *
 * The theme decides where these sit and whether they are shown; what they say is merchant
 * content, kept where the merchant already manages it. The panel says so and links there,
 * because a section with no settings and no explanation reads like an editor that lost the
 * fields.
 *
 * Only what a Basic section really draws is listed:
 *  - the banners section draws the shop's `home_top` banners (Promotions → Banners);
 *  - the header draws the notice line from the active call-to-action (Promotions → CTA);
 *  - the footer draws the shop's name, address, email and social links (Settings → Store).
 * The pop-up is drawn by the shop on every page rather than by a section, so no section
 * points at it, and Basic draws nothing that Settings → Shipping decides.
 */

/** Where a section's content is managed, and the message key that names that place. */
export type ContentPlace = { href: string; key: "contentBanners" | "contentCta" | "contentStore" };

const PLACES: Record<string, ContentPlace> = {
  banner_slider: { href: promotionsHref("banners"), key: "contentBanners" },
  header: { href: promotionsHref("cta"), key: "contentCta" },
  footer: { href: "/settings?tab=store", key: "contentStore" },
};

/** Where this section's content is managed, or null when the theme's own settings are all of it. */
export function sectionContentPlace(sectionType: string): ContentPlace | null {
  return PLACES[sectionType] ?? null;
}
