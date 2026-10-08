"use client";

/**
 * Settings > Billing (owner, 2026-10-09: design B, "like Shopify"): a band saying where the plan
 * stands -- the days left as a ring, and the one thing to do now -- then products, price and what
 * has been paid, the payments, what the plan gives and what paying yearly would save. The plan's
 * state is /auth/me/'s, as the dashboard's banners read it; the rest is GET billing/overview/ and
 * Paperbase's plans. The owner's power (Paperbase support reads it without the buttons).
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useSupportMode } from "@/hooks/useSupportMode";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import { billingBand, fetchBillingOverview, fetchPlans } from "@/lib/billing";
import { yearlyOffer } from "@/lib/plans-compare";
import { billingOverviewQueryKey, billingPlansQueryKey } from "@/lib/query-keys";

import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";
import { BillingBand, BillingTiles, PaymentTimeline, PlanIncludes, YearlyCard } from "./billing/BillingParts";

export default function BillingSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.billing");
  const { meProfile, meProfileStatus } = useAuth();
  const inSupportMode = useSupportMode();
  const router = useRouter();
  const overview = useQuery({
    queryKey: billingOverviewQueryKey,
    queryFn: fetchBillingOverview,
    enabled: !hidden,
    meta: { persist: false },
  });
  const plans = useQuery({ queryKey: billingPlansQueryKey, queryFn: fetchPlans, enabled: !hidden, meta: { persist: false } });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  if (hidden) return null;

  const sub = meProfileStatus === "ready" ? (meProfile?.subscription ?? null) : null;
  const failed = overview.isError || plans.isError;
  const ready = sub && overview.data && plans.data;

  const plan = ready ? (plans.data.find((row) => row.public_id === sub.plan_public_id) ?? null) : null;
  const offer = plan && plans.data ? yearlyOffer(plans.data, plan) : null;

  async function pay() {
    if (!plan) return;
    setPayError(null);
    setPaying(true);
    try {
      // As the dashboard's banner renews: a payment for the plan, then the checkout's bKash / Nagad steps.
      await api.post("billing/payment/initiate/", { plan_public_id: plan.public_id });
      router.push("/checkout");
    } catch {
      setPayError(t("action.payError"));
    } finally {
      setPaying(false);
    }
  }

  return (
    <section id="panel-billing" role="tabpanel" aria-labelledby="tab-billing" className={settingsSectionSurfaceClassName}>
      <SettingsSectionBody gap="compact">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">{t("heading")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <DeferredNavLink href="/plans" className="text-sm font-medium underline underline-offset-4">
            {t("comparePlans")}
          </DeferredNavLink>
        </header>

        {failed ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border p-5">
            <p className="text-sm text-muted-foreground">{t("loadError")}</p>
            <Button type="button" variant="outline" onClick={() => void Promise.all([overview.refetch(), plans.refetch()])}>
              {t("retry")}
            </Button>
          </div>
        ) : !ready ? (
          <div className="space-y-4" aria-busy="true">
            <div className="h-[188px] animate-pulse rounded-card bg-muted" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-[112px] animate-pulse rounded-card bg-muted" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <BillingBand
              band={billingBand(sub, meProfile?.latest_payment_status ?? null, overview.data)}
              plan={plan}
              planName={sub.plan}
              endDate={sub.end_date}
              canAct={!inSupportMode}
              paying={paying}
              payError={payError}
              onPay={() => void pay()}
            />
            <BillingTiles overview={overview.data} plan={plan} yearly={offer?.plan ?? null} />
            <div className="flex flex-wrap items-start gap-5">
              <PaymentTimeline payments={overview.data.payments} className="min-w-0 flex-[999_1_420px]" />
              {plan ? (
                <aside className="flex flex-[1_1_280px] flex-col gap-5">
                  <PlanIncludes plan={plan} />
                  {offer ? <YearlyCard planName={plan.name} charge={offer.charge} saving={offer.saving} /> : null}
                </aside>
              ) : null}
            </div>
          </>
        )}
      </SettingsSectionBody>
    </section>
  );
}
