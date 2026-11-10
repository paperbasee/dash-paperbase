"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import { Clock, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { FraudRisk, FraudRiskLevel } from "../../_components/types";
import type { Summary } from "../_lib/report";
import { CANCELLED_TEXT, DELIVERED_TEXT, LEVEL_BAND, LEVEL_RULE, LEVEL_TEXT } from "../_lib/tones";
import { DeliveryRing } from "./DeliveryRing";

const NAME: Record<FraudRiskLevel, string> = {
  safe: "riskSafe",
  caution: "riskCaution",
  new: "riskNew",
  risky: "riskRisky",
};

const ADVICE: Record<FraudRiskLevel, string> = {
  safe: "adviceSafe",
  caution: "adviceCaution",
  new: "adviceNew",
  risky: "adviceRisky",
};

/**
 * The answer first: the delivered share in a ring of the verdict's colour (risk.py), the verdict,
 * the number, what to do, and the parcels it was decided on. Check again asks the provider anew.
 */
export function VerdictBand({
  risk,
  phone,
  summary,
  checkedAt,
  onCheckAgain,
  checkingAgain,
  numberClass,
}: {
  risk: FraudRisk;
  /** The number as shown (`shownPhone`). */
  phone: string;
  /** The provider's parcel counts; left out when it has none to give. */
  summary: Summary | null;
  checkedAt: string | null;
  onCheckAgain: () => void;
  checkingAgain: boolean;
  numberClass: string;
}) {
  const t = useTranslations("fraudCheckPage");
  const tCheck = useTranslations("fraudCheck");
  const level = risk.level;
  const pct = Math.round(risk.success_ratio ?? 0);
  return (
    <section
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3.5 rounded-card border p-4 [grid-template-areas:'ring_head'_'body_body'] sm:gap-x-7 sm:p-6 sm:[grid-template-areas:'ring_head'_'ring_body']",
        LEVEL_BAND[level],
      )}
    >
      <DeliveryRing level={level} deliveredPct={pct} className="size-[92px] [grid-area:ring] sm:size-32">
        <span className={cn("text-[22px] font-semibold leading-none sm:text-3xl", numberClass)}>
          {level === "new" ? risk.total_parcels : `${pct}%`}
        </span>
        <span className="mt-1 text-[10px] leading-none text-muted-foreground sm:text-[11px]">
          {level === "new" ? t("ringParcels") : t("ringDelivered")}
        </span>
      </DeliveryRing>

      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2.5 [grid-area:head] sm:self-end">
        <div className="min-w-0">
          <h2 className={cn("text-2xl font-semibold leading-tight sm:text-[28px]", LEVEL_TEXT[level])}>
            {tCheck(NAME[level])}
          </h2>
          <p className={cn("mt-1 text-[15px] tracking-wide text-muted-foreground", numberClass)}>{phone}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CheckedAt checkedAt={checkedAt} />
          <Button type="button" variant="outline" size="sm" onClick={onCheckAgain} disabled={checkingAgain}>
            {checkingAgain ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            {checkingAgain ? tCheck("checkingAgain") : tCheck("checkAgain")}
          </Button>
        </div>
      </div>

      <div className="min-w-0 [grid-area:body] sm:self-start">
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-foreground">{tCheck(ADVICE[level])}</p>
        {summary && summary.total > 0 ? (
          <dl className={cn("mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t pt-4", LEVEL_RULE[level])}>
            <Count label={t("totalParcels")} value={summary.total} numberClass={numberClass} />
            <Count label={tCheck("historyDelivered")} value={summary.delivered} numberClass={numberClass} tone={DELIVERED_TEXT} />
            <Count label={tCheck("cancelled")} value={summary.cancelled} numberClass={numberClass} tone={CANCELLED_TEXT} />
          </dl>
        ) : null}
      </div>
    </section>
  );
}

function Count({ label, value, numberClass, tone }: { label: string; value: number; numberClass: string; tone?: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-[22px] font-semibold leading-tight", numberClass, tone ?? "text-foreground")}>{value}</dd>
    </div>
  );
}

/** When the provider was asked for this answer: a saved one can be days old. */
function CheckedAt({ checkedAt }: { checkedAt: string | null }) {
  const tCheck = useTranslations("fraudCheck");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const at = checkedAt ? new Date(checkedAt) : null;
  if (!at || Number.isNaN(at.getTime())) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="size-3.5 shrink-0" aria-hidden />
      <time dateTime={at.toISOString()} title={format.dateTime(at, { dateStyle: "medium", timeStyle: "short" })}>
        {tCheck("checkedAgo", { when: format.relativeTime(at, now) })}
      </time>
    </span>
  );
}
