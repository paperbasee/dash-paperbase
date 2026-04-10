"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import type { SubscriptionStatus } from "@/lib/subscription-access";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

interface MeSubscription {
  subscription_status: SubscriptionStatus;
  plan: string | null;
  plan_public_id: string | null;
  end_date: string | null;
}

export default function BillingSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const [subscription, setSubscription] = useState<MeSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<{ subscription?: MeSubscription }>("auth/me/")
      .then(({ data }) => {
        if (cancelled) return;
        setSubscription(data.subscription ?? null);
      })
      .catch(() => {
        if (!cancelled) setSubscription(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hidden]);

  const planLabel = loading ? t("billing.loading") : subscription?.plan ?? t("billing.dash");
  const statusLabel = loading
    ? t("billing.dash")
    : subscription == null
      ? t("billing.dash")
      : subscription.subscription_status === "NONE"
        ? t("billing.statusInactive")
        : subscription.subscription_status === "ACTIVE"
          ? t("billing.statusActive")
          : subscription.subscription_status === "GRACE"
            ? t("billing.statusGrace")
            : subscription.subscription_status === "EXPIRED"
              ? t("billing.statusExpired")
              : t("billing.dash");
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
