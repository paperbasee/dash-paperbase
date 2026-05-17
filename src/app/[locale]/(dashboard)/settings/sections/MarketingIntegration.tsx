"use client";

import { useTranslations } from "next-intl";
import MarketingProviderCard from "./MarketingProviderCard";
import OtherMarketingIntegrations from "./OtherMarketingIntegrations";

/**
 * Facebook CAPI and TikTok Events API each get a dedicated card (independent load/error),
 * then any other marketing providers (e.g. Google Analytics) list below.
 */
export default function MarketingIntegration({
  panelHidden = false,
}: {
  panelHidden?: boolean;
}) {
  const t = useTranslations("settings");
  return (
    <div className="mb-6 min-w-0 w-full">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {t("integrations.sectionMarketing")}
      </p>
      <div className="flex min-w-0 w-full flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        <MarketingProviderCard provider="facebook" panelHidden={panelHidden} />
        <MarketingProviderCard provider="tiktok" panelHidden={panelHidden} />
      </div>
      <div className="mt-6">
        <OtherMarketingIntegrations panelHidden={panelHidden} />
      </div>
    </div>
  );
}
