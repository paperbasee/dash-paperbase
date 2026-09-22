/**
 * What Settings → Promotions holds. The id is also the app id in
 * config/apps.ts, so it follows that app's enabled flag and view permission.
 *
 * Kept free of imports: the legacy /popup server redirect uses it.
 *
 * **There were two, and now there is one.** The CTA left on 2026-09-22: it and
 * the theme editor's announcement bar were two bars doing one job, edited in
 * two places, and the bar won. What that leaves is a list of one — kept,
 * rather than inlined, because `settingsSections.SECTION_APPS` reads it to
 * decide whether this settings section is shown to a given role at all.
 *
 * The tab bar, the `?promotion=` param and the resolver that read it went with
 * the CTA. A tablist holding one tab is a control that decides nothing, and a
 * screen reader announces it as a choice.
 */
export const PROMOTION_TABS = ["popup"] as const;

export type PromotionTab = (typeof PROMOTION_TABS)[number];

/** Settings URL (without locale) that opens Promotions. */
export function promotionsHref(): string {
  return "/settings?tab=promotions";
}

/** The promotions apps this store has on AND this role may view. */
export function visiblePromotionTabs(
  canShowApp: (appId: string) => boolean,
): PromotionTab[] {
  return PROMOTION_TABS.filter((tab) => canShowApp(tab));
}
