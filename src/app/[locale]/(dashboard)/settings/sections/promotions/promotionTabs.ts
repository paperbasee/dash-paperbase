/**
 * Tabs of Settings → Promotions, in display order. Each id is also the app id in
 * config/apps.ts, so a tab follows that app's enabled flag and view permission.
 *
 * Kept free of imports: the legacy /banners, /popup and /cta server redirects use it.
 */
export const PROMOTION_TABS = ["banners", "popup", "cta"] as const;

export type PromotionTab = (typeof PROMOTION_TABS)[number];

/** Query param for the active tab; `tab` already selects the settings section. */
export const PROMOTION_TAB_PARAM = "promotion";

/** Settings URL (without locale) that opens Promotions on the given tab. */
export function promotionsHref(tab: PromotionTab): string {
  return `/settings?tab=promotions&${PROMOTION_TAB_PARAM}=${tab}`;
}

/** Tabs whose app is enabled for the store AND viewable by the user's role. */
export function visiblePromotionTabs(
  canShowApp: (appId: string) => boolean,
): PromotionTab[] {
  return PROMOTION_TABS.filter((tab) => canShowApp(tab));
}

/** The requested tab when the user can open it, else their first visible tab. */
export function resolvePromotionTab(
  requested: string | null,
  visible: readonly PromotionTab[],
): PromotionTab | null {
  const candidate = (requested ?? "").trim();
  return visible.find((tab) => tab === candidate) ?? visible[0] ?? null;
}
