"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../../SettingsSectionBody";
import ShippingPanel from "./ShippingPanel";

export default function ShippingSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");

  // Mount only while open: the panel fetches zones, methods and rates and shows an
  // error toast when they fail, which must not happen on every other settings tab.
  if (hidden) return null;

  return (
    <section
      id="panel-shipping"
      role="tabpanel"
      aria-labelledby="tab-shipping"
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("shipping.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("shipping.subtitle")}</p>
        </div>

        <ShippingPanel />
      </SettingsSectionBody>
    </section>
  );
}
