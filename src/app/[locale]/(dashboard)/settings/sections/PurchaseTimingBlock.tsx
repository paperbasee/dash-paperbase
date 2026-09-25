"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/context/PermissionsContext";
import { useMarketingIntegrationsQuery } from "@/hooks/useMarketingIntegrationsQuery";
import { purchaseTimingQueryKey } from "@/lib/query-keys";
import {
  PURCHASE_TIMINGS,
  fetchPurchaseTiming,
  savePurchaseTiming,
  type PurchaseTiming,
} from "@/lib/marketing/purchase-timing";
import { notify } from "@/notifications";

/**
 * When a cash on delivery order counts as a sale for the shop's ads (owner,
 * 2026-09-25): when it is placed, or when the merchant confirms it. ONE choice
 * for Meta and TikTok together, so it sits under both of their cards and says
 * so, rather than twice with a chance of the two disagreeing.
 *
 * Drawn once the shop has a Meta or TikTok connection -- before that it would
 * decide nothing. Anyone who can see the integrations sees it; only someone who
 * can manage them (owner, admin) can change it.
 */
export default function PurchaseTimingBlock({ panelHidden = false }: { panelHidden?: boolean }) {
  const t = useTranslations("settings.marketing.purchaseTiming");
  const tPages = useTranslations("pages");
  const queryClient = useQueryClient();
  const canManage = usePermissions().has("integrations.manage");
  const { data: connections = [] } = useMarketingIntegrationsQuery({ enabled: !panelHidden });
  const tracks = connections.some((one) => one.provider === "facebook" || one.provider === "tiktok");

  const { data: chosen } = useQuery({
    queryKey: purchaseTimingQueryKey,
    queryFn: () => fetchPurchaseTiming(api),
    enabled: !panelHidden && tracks,
  });
  const [saving, setSaving] = useState<PurchaseTiming | null>(null);
  const save = useMutation({
    mutationFn: (timing: PurchaseTiming) => savePurchaseTiming(api, timing),
    onMutate: (timing) => setSaving(timing),
    onSuccess: (timing) => queryClient.setQueryData(purchaseTimingQueryKey, timing),
    onError: (error) =>
      notify.error(error, {
        title: tPages("toastTitleMarketingLinkFailed"),
        fallbackMessage: tPages("toastDescMarketingLinkFailed"),
      }),
    onSettled: () => setSaving(null),
  });

  if (!tracks || !chosen) return null;

  return (
    <div className="px-3.5 py-3">
      <p id="purchase-timing-title" className="text-[13px] font-medium text-foreground">
        {t("title")}
      </p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{t("intro")}</p>

      <div
        role="radiogroup"
        aria-labelledby="purchase-timing-title"
        className="mt-3 grid gap-2 sm:grid-cols-2"
      >
        {PURCHASE_TIMINGS.map((timing) => {
          const selected = chosen === timing;
          return (
            <button
              key={timing}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!canManage || saving !== null}
              onClick={() => {
                if (!selected) save.mutate(timing);
              }}
              className={cn(
                "flex min-h-11 items-start gap-2.5 rounded-card border px-3 py-2.5 text-start transition-colors",
                "disabled:cursor-not-allowed",
                selected
                  ? "border-foreground bg-muted/40"
                  : "border-border hover:border-foreground/40 disabled:hover:border-border",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                  selected ? "border-foreground bg-foreground text-background" : "border-muted-foreground/50",
                )}
              >
                {selected ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-foreground">
                  {t(timing)}
                  {saving === timing ? ` · ${t("saving")}` : ""}
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                  {t(`${timing}Note`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/*
        What a merchant who waits for confirmation has to know -- the two things
        that surprise people: an order left unconfirmed for 7 days never counts
        (the API's hourly sweep expires its match details,
        TRACKING_PURCHASE_MATCH_RETENTION_DAYS), and Meta cannot aim ads at a
        custom event without a custom conversion.
      */}
      {chosen === "confirmation" ? (
        <ul className="mt-2.5 list-disc space-y-1 ps-5 text-[12px] leading-relaxed text-muted-foreground">
          <li>{t("confirmationLate")}</li>
          <li>{t("confirmationGoal")}</li>
        </ul>
      ) : null}
      <p className="mt-2.5 text-[12px] text-muted-foreground">{t("prepaidNote")}</p>
      {!canManage ? <p className="mt-1 text-[12px] text-muted-foreground">{t("askToChange")}</p> : null}
    </div>
  );
}
