"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

type NotificationPrefs = {
  orders: boolean;
  supportTickets: boolean;
  emailMeOnOrderReceived: boolean;
  emailCustomerOnOrderConfirmed: boolean;
};

export default function NotificationsSection({
  hidden,
  notificationPrefs,
  onUpdatePref,
  orderEmailNotificationsEnabled,
  orderEmailFeatureLoading,
  emailPrefsSaving,
}: {
  hidden: boolean;
  notificationPrefs: NotificationPrefs;
  onUpdatePref: (key: keyof NotificationPrefs, value: boolean) => void;
  orderEmailNotificationsEnabled: boolean;
  orderEmailFeatureLoading: boolean;
  emailPrefsSaving: boolean;
}) {
  const t = useTranslations("settings");
  const emailLocked =
    orderEmailFeatureLoading || !orderEmailNotificationsEnabled || emailPrefsSaving;
  return (
    <section
      id="panel-notifications"
      role="tabpanel"
      aria-labelledby="tab-notifications"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("notifications.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("notifications.subtitle")}</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">{t("notifications.orders")}</span>
            <input type="checkbox" className="form-checkbox" checked={notificationPrefs.orders} onChange={(e) => onUpdatePref("orders", e.target.checked)} />
          </label>

          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">{t("notifications.supportTickets")}</span>
            <input
              type="checkbox"
              className="form-checkbox"
              checked={notificationPrefs.supportTickets}
              onChange={(e) => onUpdatePref("supportTickets", e.target.checked)}
            />
          </label>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-foreground">{t("notifications.emailSection")}</label>
            {!orderEmailFeatureLoading && !orderEmailNotificationsEnabled && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                <Lock className="size-3 shrink-0" aria-hidden />
                {t("notifications.premium")}
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{t("notifications.emailHint")}</p>

          <div className="space-y-3">
            <label
              className={`flex items-center justify-between gap-4 text-sm ${emailLocked ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span className="text-foreground">{t("notifications.emailOwnerOnOrder")}</span>
              <input
                type="checkbox"
                className="form-checkbox"
                disabled={emailLocked}
                checked={notificationPrefs.emailMeOnOrderReceived}
                onChange={(e) => onUpdatePref("emailMeOnOrderReceived", e.target.checked)}
              />
            </label>

            <label
              className={`flex items-center justify-between gap-4 text-sm ${emailLocked ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span className="text-foreground">{t("notifications.emailCustomerCourier")}</span>
              <input
                type="checkbox"
                className="form-checkbox"
                disabled={emailLocked}
                checked={notificationPrefs.emailCustomerOnOrderConfirmed}
                onChange={(e) => onUpdatePref("emailCustomerOnOrderConfirmed", e.target.checked)}
              />
            </label>
          </div>
        </div>
      </SettingsSectionBody>
    </section>
  );
}

