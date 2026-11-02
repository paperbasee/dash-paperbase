"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, ChevronRight } from "lucide-react";
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
import { DIALOG_BODY, ServiceDialog } from "./integrations/ServiceCard";

/**
 * When a cash on delivery order counts as a sale for the shop's ads (owner,
 * 2026-09-25): when it is placed, or when the merchant confirms it. ONE choice
 * for Meta and TikTok together, so it sits on the page and says so, rather than
 * twice with a chance of the two disagreeing. One line showing the choice
 * (owner, 2026-11-02); the choice and all its small print open in a pop-up.
 *
 * Drawn once the shop has a Meta or TikTok connection -- before that it would
 * decide nothing. Anyone who can see the integrations sees it; only someone who
 * can manage them (owner, admin) can change it.
 */
export default function PurchaseTimingBlock({
  panelHidden = false,
  className,
}: {
  panelHidden?: boolean;
  className?: string;
}) {
  const t = useTranslations("settings.marketing.purchaseTiming");
  const queryClient = useQueryClient();
  const canManage = usePermissions().has("integrations.manage");
  const { data: connections = [] } = useMarketingIntegrationsQuery({ enabled: !panelHidden });
  const tracks = connections.some((one) => one.provider === "facebook" || one.provider === "tiktok");

  const { data: chosen } = useQuery({
    queryKey: purchaseTimingQueryKey,
    queryFn: () => fetchPurchaseTiming(api),
    enabled: !panelHidden && tracks,
  });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<PurchaseTiming | null>(null);
  const save = useMutation({
    mutationFn: (timing: PurchaseTiming) => savePurchaseTiming(api, timing),
    onMutate: (timing) => setSaving(timing),
    onSuccess: (timing) => queryClient.setQueryData(purchaseTimingQueryKey, timing),
    onError: (error) =>
      notify.error(error, {
        title: t("saveFailedTitle"),
        fallbackMessage: t("saveFailedBody"),
      }),
    onSettled: () => setSaving(null),
  });

  if (!tracks || !chosen) return null;

  return (
    <div className={className}>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="group block w-full border-t border-border pt-4 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
      >
        <span className="block text-[13px] font-medium leading-snug text-foreground group-hover:underline group-hover:underline-offset-[3px]">
          {t("title")}
        </span>
        <span className="mt-1 flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
          {t(chosen)}
          <ChevronRight aria-hidden className="size-3.5 shrink-0 rtl:rotate-180" />
        </span>
      </button>

      <ServiceDialog open={open} onOpenChange={setOpen} title={t("title")} subtitle={t("intro")}>
        <div className={DIALOG_BODY}>
          <div
            role="radiogroup"
            aria-label={t("title")}
            className="divide-y divide-border overflow-hidden rounded-ui bg-muted/60 ring-1 ring-inset ring-border"
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
                    "flex min-h-11 w-full items-start justify-between gap-4 px-4 py-[15px] text-start transition-colors",
                    "outline-none focus-visible:bg-foreground/5 disabled:cursor-not-allowed",
                    selected ? "bg-foreground/[0.065]" : "hover:bg-foreground/[0.04] disabled:hover:bg-transparent",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-foreground">
                      {t(timing)}
                      {saving === timing ? ` · ${t("saving")}` : ""}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                      {t(`${timing}Note`)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-px grid size-5 shrink-0 place-items-center rounded-full border",
                      selected ? "border-foreground bg-foreground text-background" : "border-muted-foreground/50",
                    )}
                  >
                    {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
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
            <ul className="mt-3.5 list-disc space-y-1 ps-5 text-[12px] leading-relaxed text-muted-foreground">
              <li>{t("confirmationLate")}</li>
              <li>{t("confirmationGoal")}</li>
            </ul>
          ) : null}
          <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">{t("prepaidNote")}</p>
          {!canManage ? <p className="mt-1 text-[12px] text-muted-foreground">{t("askToChange")}</p> : null}
        </div>
      </ServiceDialog>
    </div>
  );
}
