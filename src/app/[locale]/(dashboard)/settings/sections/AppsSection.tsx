"use client";

import { useState, type ComponentType } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnalyticsPremiumCard } from "@/components/premium/AnalyticsPremiumCard";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  APP_CONFIG,
  APP_PLAN_FEATURE,
  APPS_SCREEN_ALWAYS_ON_IDS,
  APPS_SCREEN_SWITCHABLE_IDS,
  planIncludesApp,
} from "@/config/apps";
import { usePermissions } from "@/context/PermissionsContext";
import { useFeatures } from "@/hooks/useFeatures";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

/**
 * What switching on an app the plan doesn't include shows instead (APP_PLAN_FEATURE; owner,
 * 2026-10-04): its Premium card.
 */
const PREMIUM_CARD: Record<string, ComponentType<{ onBack: () => void }>> = {
  analytics: AnalyticsPremiumCard,
};

export default function AppsSection({
  hidden,
  enabledApps,
}: {
  hidden: boolean;
  enabledApps: {
    isEnabled: (appId: string) => boolean;
    toggleApp: (appId: string) => void | Promise<void>;
  };
}) {
  const t = useTranslations("settings");
  // Enabling/disabling apps writes store settings — view-only roles can't toggle.
  const { has } = usePermissions();
  const canManage = has("settings.manage");
  const { features } = useFeatures();
  const [premiumFor, setPremiumFor] = useState<string | null>(null);
  const PremiumCard = premiumFor ? PREMIUM_CARD[premiumFor] : null;
  return (
    <section
      id="panel-apps"
      role="tabpanel"
      aria-labelledby="tab-apps"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("apps.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("apps.subtitle")}</p>
        </div>

        {/* @container: column count follows the settings panel width (sidebar + iPad), not the viewport */}
        <div className="space-y-6 @container min-w-0">
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("apps.essential")}</h3>
          <div className="grid min-w-0 grid-cols-1 gap-3 @min-[40rem]:grid-cols-2 @min-[64rem]:grid-cols-3">
            {APPS_SCREEN_ALWAYS_ON_IDS.map((id) => {
              const app = APP_CONFIG[id];
              const Icon = app.icon;
              return (
                <div
                  key={id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-card border border-border bg-muted/30 px-4 py-3"
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{t(`apps.items.${id}.label` as never)}</p>
                    <p className="text-xs text-muted-foreground">{t(`apps.items.${id}.description` as never)}</p>
                  </div>
                  <span className="shrink-0 justify-self-end whitespace-nowrap rounded-tooltip bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {t("apps.alwaysOn")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("apps.optional")}</h3>
          <div className="grid min-w-0 grid-cols-1 gap-3 @min-[40rem]:grid-cols-2 @min-[64rem]:grid-cols-3">
            {APPS_SCREEN_SWITCHABLE_IDS.map((id) => {
              const app = APP_CONFIG[id];
              const Icon = app.icon;
              // Not on this plan: off, whatever was switched, and switching it on shows its card.
              const included = planIncludesApp(id, features);
              const on = included && enabledApps.isEnabled(id);
              return (
                <div
                  key={id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-card border border-border bg-muted/30 px-4 py-3"
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      {t(`apps.items.${id}.label` as never)}
                      {/* A Premium app (owner, 2026-10-04): a gold star by its name, on every plan. */}
                      {APP_PLAN_FEATURE[id] ? (
                        <Star
                          role="img"
                          aria-label={t("apps.premium")}
                          className="size-3.5 shrink-0 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
                        />
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{t(`apps.items.${id}.description` as never)}</p>
                  </div>
                  <label
                    className={`flex items-center gap-2 justify-self-end ${canManage ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => (included ? enabledApps.toggleApp(id) : setPremiumFor(id))}
                      disabled={!canManage}
                      className="form-checkbox"
                    />
                    <span className="whitespace-nowrap text-sm text-muted-foreground">
                      {on ? t("apps.enabled") : t("apps.disabled")}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </SettingsSectionBody>

      <Dialog open={PremiumCard !== null} onOpenChange={(open) => !open && setPremiumFor(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-sm overflow-visible rounded-none border-0 bg-transparent [box-shadow:none]"
        >
          <DialogTitle className="sr-only">{t("apps.premium")}</DialogTitle>
          {PremiumCard ? <PremiumCard onBack={() => setPremiumFor(null)} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

