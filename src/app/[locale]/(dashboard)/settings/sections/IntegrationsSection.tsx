"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";
import { cn } from "@/lib/utils";
import CourierIntegration from "./CourierIntegration";
import MarketingIntegration from "./MarketingIntegration";

export default function IntegrationsSection({
  hidden,
}: {
  hidden: boolean;
}) {
  const t = useTranslations("settings");
  return (
    <section
      id="panel-integrations"
      role="tabpanel"
      aria-labelledby="tab-integrations"
      hidden={hidden}
      className={cn(settingsSectionSurfaceClassName, "min-w-0")}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="mb-1 text-[15px] font-medium text-foreground">{t("integrations.heading")}</h2>
          <p className="text-[13px] text-muted-foreground">{t("integrations.subtitle")}</p>
        </div>

        <div className="flex min-w-0 w-full flex-col gap-0">
          <MarketingIntegration panelHidden={hidden} />
          <CourierIntegration panelHidden={hidden} />
        </div>
      </SettingsSectionBody>
    </section>
  );
}
