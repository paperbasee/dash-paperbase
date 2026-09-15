"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useCanShowApp } from "@/hooks/useCanShowApp";
import { cn } from "@/lib/utils";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../../SettingsSectionBody";
import BannersPanel from "./BannersPanel";
import PopupPanel from "./PopupPanel";
import CtaPanel from "./CtaPanel";
import {
  PROMOTION_TAB_PARAM,
  resolvePromotionTab,
  visiblePromotionTabs,
  type PromotionTab,
} from "./promotionTabs";

export default function PromotionsSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const searchParams = useSearchParams();
  const canShowApp = useCanShowApp();

  const tabs = visiblePromotionTabs(canShowApp);
  const activeTab = resolvePromotionTab(searchParams.get(PROMOTION_TAB_PARAM), tabs);

  // Mount only the open tab: each panel fetches, shows error toasts, runs timers and
  // document listeners while mounted, and the panels reuse DOM ids such as is_active.
  if (hidden || !activeTab) return null;

  function selectTab(next: PromotionTab) {
    if (next === activeTab) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(PROMOTION_TAB_PARAM, next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }

  return (
    <section
      id="panel-promotions"
      role="tabpanel"
      aria-labelledby="tab-promotions"
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("promotions.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("promotions.subtitle")}</p>
        </div>

        <div
          role="tablist"
          aria-label={t("promotions.tabsAria")}
          className="flex gap-1 rounded-md bg-muted p-0.5 w-fit"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`promotion-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls="promotion-panel"
              onClick={() => selectTab(tab)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tNav(tab)}
            </button>
          ))}
        </div>

        <div id="promotion-panel" role="tabpanel" aria-labelledby={`promotion-tab-${activeTab}`}>
          {activeTab === "banners" && <BannersPanel />}
          {activeTab === "popup" && <PopupPanel />}
          {activeTab === "cta" && <CtaPanel />}
        </div>
      </SettingsSectionBody>
    </section>
  );
}
