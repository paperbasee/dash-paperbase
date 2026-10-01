"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";
import { cn } from "@/lib/utils";
import { SupportReadOnly } from "@/components/support/SupportReadOnly";
import { usePermissions } from "@/context/PermissionsContext";
import { useCouriersQuery } from "@/hooks/useCouriersQuery";
import { useMarketingIntegrationsQuery } from "@/hooks/useMarketingIntegrationsQuery";
import { useOwnerPower } from "@/hooks/useOwnerPower";
import { notify } from "@/notifications";
import {
  AD_SERVICES,
  AD_SERVICES_COMING_SOON,
  DELIVERY_SERVICES_COMING_SOON,
  type ServiceKey,
} from "@/lib/integrations/services";
import { ServiceCard } from "./integrations/ServiceCard";
import PixelServiceCard from "./integrations/PixelServiceCard";
import SteadfastServiceCard from "./integrations/SteadfastServiceCard";
import PurchaseTimingBlock from "./PurchaseTimingBlock";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

/** Columns follow the settings panel's width (sidebar, iPad), not the screen's -- as on Apps. */
const GRID = "grid min-w-0 grid-cols-1 gap-3 @min-[36rem]:grid-cols-2 @min-[54rem]:grid-cols-3";

/**
 * Settings > Integrations (owner, 2026-09-25): a card per service, the
 * Paperbase mark and the service's logo joined by arrows. A card opens its
 * service's pop-up, which lists that service's connections.
 *
 * The courier accounts are the owner's alone (config/owner-powers.ts "couriers"): cash-on-delivery
 * money is collected into them, so they show only to the owner -- the ads to whoever may see them.
 */
export default function IntegrationsSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.integrations");

  const showAds = usePermissions().has("integrations.view");
  const showCouriers = useOwnerPower()("couriers");

  // Both queries feed several cards; a failure is reported once, here.
  const marketing = useMarketingIntegrationsQuery({ enabled: !hidden && showAds });
  const couriers = useCouriersQuery({ enabled: !hidden && showCouriers });
  useEffect(() => {
    const error = marketing.error ?? couriers.error;
    if (!error) return;
    notify.error(error, { title: t("loadFailedTitle"), fallbackMessage: t("loadFailedBody") });
  }, [marketing.error, couriers.error, t]);

  const comingSoon = (key: ServiceKey) => (
    <ServiceCard
      key={key}
      service={key}
      name={t(`services.${key}`)}
      status={t("comingSoonNote")}
      tone="none"
      comingSoon
    />
  );

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
          <h2 className="mb-1 text-[15px] font-medium text-foreground">{t("heading")}</h2>
          <p className="text-[13px] text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="@container flex min-w-0 flex-col gap-6">
          {showAds ? (
            <Group title={t("sectionAds")}>
              <div className={GRID}>
                {AD_SERVICES.map((provider) => (
                  <PixelServiceCard key={provider} provider={provider} panelHidden={hidden} />
                ))}
                {AD_SERVICES_COMING_SOON.map(comingSoon)}
              </div>
              {/* One choice for Meta and TikTok together, so it sits under both. */}
              <PurchaseTimingBlock panelHidden={hidden} />
            </Group>
          ) : null}

          {showCouriers ? (
            <Group title={t("sectionDelivery")}>
              <SupportReadOnly>
                <div className={GRID}>
                  <SteadfastServiceCard panelHidden={hidden} />
                  {DELIVERY_SERVICES_COMING_SOON.map(comingSoon)}
                </div>
              </SupportReadOnly>
            </Group>
          ) : null}
        </div>
      </SettingsSectionBody>
    </section>
  );
}
