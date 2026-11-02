"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { settingsSectionSurfaceClassName } from "../SettingsSectionBody";
import { cn } from "@/lib/utils";
import { FilterToggle } from "@/components/filters/FilterToggle";
import { PageHint } from "@/components/page/PageHint";
import { SupportReadOnly } from "@/components/support/SupportReadOnly";
import { usePermissions } from "@/context/PermissionsContext";
import { useCouriersQuery } from "@/hooks/useCouriersQuery";
import { useMarketingIntegrationsQuery } from "@/hooks/useMarketingIntegrationsQuery";
import { useOwnerPower } from "@/hooks/useOwnerPower";
import { notify } from "@/notifications";
import {
  countByStanding,
  inGroups,
  listServices,
  serviceState,
  shownServices,
  type ServiceEntry,
  type ServiceGroup,
  type ServiceStanding,
} from "@/lib/integrations/services";
import { ServiceCard } from "./integrations/ServiceCard";
import { IntegrationFilters } from "./integrations/IntegrationFilters";
import PixelServiceCard from "./integrations/PixelServiceCard";
import SteadfastServiceCard from "./integrations/SteadfastServiceCard";
import PurchaseTimingBlock from "./PurchaseTimingBlock";

/**
 * Wide enough for the filter column beside the cards. It follows the settings panel's width
 * (sidebar, iPad), not the screen's -- as on Apps. The first row is fixed so the taller column
 * beside it cannot stretch the title.
 */
const LAYOUT =
  "flex flex-col @min-[48rem]/page:grid @min-[48rem]/page:grid-cols-[14.375rem_minmax(0,1fr)] @min-[48rem]/page:grid-rows-[3.25rem_auto_1fr]";
const MAIN_COLUMN = "@min-[48rem]/page:col-start-2 @min-[48rem]/page:border-s @min-[48rem]/page:border-border @min-[48rem]/page:ps-7";
const SIDE_COLUMN = "@min-[48rem]/page:col-start-1 @min-[48rem]/page:pe-6";

/**
 * Settings > Integrations (owner, 2026-11-02, from a design they chose): a filter column and a card
 * per service. A card opens its service's pop-up, which lists that service's connections.
 *
 * The courier accounts are the owner's alone (config/owner-powers.ts "couriers"): cash-on-delivery
 * money is collected into them, so they show only to the owner -- the ads to whoever may see them.
 */
export default function IntegrationsSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.integrations");

  const showAds = usePermissions().has("integrations.manage");
  const showCouriers = useOwnerPower()("couriers");

  // Both queries feed several cards; a failure is reported once, here.
  const marketing = useMarketingIntegrationsQuery({ enabled: !hidden && showAds });
  const couriers = useCouriersQuery({ enabled: !hidden && showCouriers });
  useEffect(() => {
    const error = marketing.error ?? couriers.error;
    if (!error) return;
    notify.error(error, { title: t("loadFailedTitle"), fallbackMessage: t("loadFailedBody") });
  }, [marketing.error, couriers.error, t]);

  const [standing, setStanding] = useState<ServiceStanding | null>(null);
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const services = useMemo<ServiceEntry[]>(() => {
    const pixels = marketing.data ?? [];
    return listServices(
      { ads: showAds, delivery: showCouriers },
      {
        facebook: serviceState(pixels.filter((one) => one.provider === "facebook")),
        tiktok: serviceState(pixels.filter((one) => one.provider === "tiktok")),
        steadfast: serviceState(couriers.data ?? []),
      },
    );
  }, [marketing.data, couriers.data, showAds, showCouriers]);

  const loading = marketing.isLoading || couriers.isLoading;
  const counts = loading ? null : countByStanding(inGroups(services, groups));
  const shown = useMemo(
    () => new Set(shownServices(services, groups, standing).map((entry) => entry.key)),
    [services, groups, standing],
  );
  const showsGroup = (group: ServiceGroup) => services.some((entry) => entry.group === group);

  return (
    <section
      id="panel-integrations"
      role="tabpanel"
      aria-labelledby="tab-integrations"
      hidden={hidden}
      className={cn(settingsSectionSurfaceClassName, "min-w-0")}
    >
      <div className="@container/page min-w-0">
        <div className={LAYOUT}>
          <div className={cn(MAIN_COLUMN, "@min-[48rem]/page:row-start-1")}>
            <div className="mb-3.5 flex min-h-9 items-center gap-1.5 @min-[48rem]/page:mb-0">
              <h2 className="min-w-0 truncate text-[17px] font-semibold text-foreground">{t("heading")}</h2>
              <PageHint>{t("subtitle")}</PageHint>
              <div className="ms-auto @min-[48rem]/page:hidden">
                <FilterToggle
                  open={filtersOpen}
                  active={standing !== null || groups.length > 0}
                  onToggle={() => setFiltersOpen((open) => !open)}
                />
              </div>
            </div>
          </div>

          <aside
            className={cn(
              SIDE_COLUMN,
              "mb-3.5 border-b border-border pb-3 @min-[48rem]/page:row-span-2 @min-[48rem]/page:row-start-1 @min-[48rem]/page:mb-0 @min-[48rem]/page:block @min-[48rem]/page:border-b-0 @min-[48rem]/page:pb-0",
              !filtersOpen && "hidden",
            )}
          >
            <IntegrationFilters
              counts={counts}
              standing={standing}
              onStanding={setStanding}
              groups={groups}
              onGroups={setGroups}
              showGroups={showsGroup("ads") && showsGroup("delivery")}
            />
          </aside>

          <div className={cn(MAIN_COLUMN, "@container/cards min-w-0 @min-[48rem]/page:row-span-2 @min-[48rem]/page:row-start-2")}>
            <div className="grid grid-cols-2 gap-2.5 @min-[36rem]/cards:gap-4 @min-[54rem]/cards:grid-cols-3">
              {showAds ? (
                <>
                  <PixelServiceCard provider="facebook" panelHidden={hidden} filteredOut={!shown.has("facebook")} />
                  <PixelServiceCard provider="tiktok" panelHidden={hidden} filteredOut={!shown.has("tiktok")} />
                </>
              ) : null}
              {showCouriers ? (
                <SupportReadOnly className={cn("col-span-2 @min-[36rem]/cards:col-span-1", !shown.has("steadfast") && "hidden")}>
                  <SteadfastServiceCard panelHidden={hidden} filteredOut={!shown.has("steadfast")} />
                </SupportReadOnly>
              ) : null}
              {services
                .filter((entry) => entry.standing === "coming_soon")
                .map((entry) => {
                  const name = t(`services.${entry.key}`);
                  return (
                    <ServiceCard
                      key={entry.key}
                      service={entry.key}
                      name={name}
                      blurb={
                        entry.group === "ads"
                          ? t("blurbs.google_analytics")
                          : t("blurbs.courier", { service: name })
                      }
                      tone="none"
                      comingSoon
                      filteredOut={!shown.has(entry.key)}
                    />
                  );
                })}
            </div>
          </div>

          {/* One choice for Meta and TikTok together, so it belongs to the page and not to a card. */}
          {showAds ? (
            <PurchaseTimingBlock
              panelHidden={hidden}
              className={cn(SIDE_COLUMN, "mt-3.5 @min-[48rem]/page:row-start-3 @min-[48rem]/page:mt-[22px]")}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
