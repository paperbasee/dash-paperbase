"use client";

import { useTranslations } from "next-intl";
import { APP_CONFIG, ESSENTIAL_APP_IDS, OPTIONAL_APP_IDS } from "@/config/apps";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

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

        <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("apps.essential")}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ESSENTIAL_APP_IDS.map((id) => {
              const app = APP_CONFIG[id];
              const Icon = app.icon;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-card border border-border bg-muted/30 px-4 py-3"
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{t(`apps.items.${id}.label` as never)}</p>
                    <p className="text-xs text-muted-foreground">{t(`apps.items.${id}.description` as never)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {t("apps.alwaysOn")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("apps.optional")}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OPTIONAL_APP_IDS.map((id) => {
              const app = APP_CONFIG[id];
              const Icon = app.icon;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-card border border-border bg-muted/30 px-4 py-3"
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{t(`apps.items.${id}.label` as never)}</p>
                    <p className="text-xs text-muted-foreground">{t(`apps.items.${id}.description` as never)}</p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabledApps.isEnabled(id)}
                      onChange={() => enabledApps.toggleApp(id)}
                      className="form-checkbox"
                    />
                    <span className="text-sm text-muted-foreground">
                      {enabledApps.isEnabled(id) ? t("apps.enabled") : t("apps.disabled")}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </SettingsSectionBody>
    </section>
  );
}

