"use client";

import { useTranslations } from "next-intl";
import { useCanShowApp } from "@/hooks/useCanShowApp";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../../SettingsSectionBody";
import PopupPanel from "./PopupPanel";
import { visiblePromotionTabs } from "./promotionTabs";

export default function PromotionsSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const canShowApp = useCanShowApp();

  // Nothing to show when the pop-up is switched off for this shop or this
  // user's role may not open it. The list is this section's access rule now
  // rather than a set of tabs -- there is one panel left.
  //
  // It is also still a mount guard: the panel fetches, shows error toasts and
  // runs timers while mounted, so a hidden section must not render it.
  if (hidden || visiblePromotionTabs(canShowApp).length === 0) return null;

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

        {/*
          One panel, so no tab bar. There were two -- the pop-up and a CTA --
          until 2026-09-22, when the CTA and the theme editor's announcement bar
          turned out to be two bars doing one job and the bar won. A tablist
          holding a single tab is a control that decides nothing, and a screen
          reader announces it as a choice.
        */}
        <PopupPanel />
      </SettingsSectionBody>
    </section>
  );
}
