"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import {
  billingSettingsStatusKey,
  type BillingSettingsStatusKey,
  resolveSubscriptionUIState,
} from "@/lib/subscription-ui-state";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

export default function BillingSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const { meProfile, meProfileStatus, meProfileFetching } = useAuth();

  const loading =
    !hidden &&
    (meProfileStatus === "loading" ||
      meProfileStatus === "idle" ||
      meProfileFetching);

  const subscription = !hidden && meProfileStatus === "ready" ? meProfile?.subscription ?? null : null;
  const latestPaymentStatus =
    !hidden && meProfileStatus === "ready"
      ? (meProfile?.latest_payment_status ?? null)
      : null;

  const uiState =
    subscription
      ? resolveSubscriptionUIState(
          subscription.subscription_status,
          latestPaymentStatus,
        )
      : null;
  const statusKey: BillingSettingsStatusKey | null =
    subscription && uiState !== null
      ? billingSettingsStatusKey(uiState, subscription.subscription_status)
      : null;

  const billingStatusLabel = (key: BillingSettingsStatusKey) => {
    switch (key) {
      case "statusActive":
        return t("billing.statusActive");
      case "statusInactive":
        return t("billing.statusInactive");
      case "statusGrace":
        return t("billing.statusGrace");
      case "statusExpired":
        return t("billing.statusExpired");
      case "statusPendingReview":
        return t("billing.statusPendingReview");
      case "statusRejected":
        return t("billing.statusRejected");
    }
  };

  const planLabel = loading ? t("billing.loading") : subscription?.plan ?? t("billing.dash");
  const statusLabel = loading
    ? t("billing.dash")
    : subscription == null || statusKey == null
      ? t("billing.dash")
      : billingStatusLabel(statusKey);
  const endLabel = loading ? t("billing.dash") : subscription?.end_date ?? t("billing.dash");

  return (
    <section
      id="panel-billing"
      role="tabpanel"
      aria-labelledby="tab-billing"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody gap="compact">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("billing.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("billing.subtitle")}</p>
        </div>

        <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">{t("billing.currentPlan")}</label>
          <Input value={planLabel} readOnly className="bg-muted/50" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">{t("billing.subscriptionStatus")}</label>
          <Input value={statusLabel} readOnly className="bg-muted/50" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">{t("billing.periodEnds")}</label>
          <Input value={endLabel} readOnly className="bg-muted/50" />
        </div>
        </div>
      </SettingsSectionBody>
    </section>
  );
}
