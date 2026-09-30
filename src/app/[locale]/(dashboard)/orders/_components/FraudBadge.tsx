"use client";

import { useTranslations } from "next-intl";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { FraudRiskLevel } from "./types";

/**
 * An order's fraud colour (owner, 2026-09-30: "the colour badge on orders"), as the API decided
 * and kept it (engine/apps/fraud_check/risk.py): a ring filled to the share of the customer's
 * parcels that were delivered, everywhere, in the colour it earns -- green safe, amber caution
 * or new, red risky -- with what that means and how many parcels it rests on beside it.
 *
 * Owner, 2026-09-30, of the first version (a "● 96%" pill): "looks so poorly designed ... make this
 * more premium and polished".
 */

const RING: Record<FraudRiskLevel, string> = {
  safe: "text-emerald-500",
  caution: "text-amber-500",
  new: "text-amber-500",
  risky: "text-red-500",
};

const NAME_TONE: Record<FraudRiskLevel, string> = {
  safe: "text-emerald-700 dark:text-emerald-400",
  caution: "text-amber-700 dark:text-amber-400",
  new: "text-amber-700 dark:text-amber-400",
  risky: "text-red-700 dark:text-red-400",
};

const NAME_KEY: Record<FraudRiskLevel, string> = {
  safe: "riskSafe",
  caution: "riskCaution",
  new: "riskNew",
  risky: "riskRisky",
};

export function isFraudRiskLevel(value: unknown): value is FraudRiskLevel {
  return value === "safe" || value === "caution" || value === "new" || value === "risky";
}

const SIZE = 40;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const AROUND = 2 * Math.PI * RADIUS;

/** The share delivered, as a ring filled that far round; a new customer's is an empty ring. */
function Ring({ level, share }: { level: FraudRiskLevel; share: number | null }) {
  const filled = share === null ? 0 : Math.max(0, Math.min(100, share));
  return (
    <span className="relative inline-flex size-10 shrink-0 items-center justify-center" aria-hidden>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full -rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-current text-foreground/10"
          strokeDasharray={share === null ? "2.5 3.5" : undefined}
        />
        {share !== null ? (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className={cn("stroke-current", RING[level])}
            strokeDasharray={`${(filled / 100) * AROUND} ${AROUND}`}
          />
        ) : null}
      </svg>
      {/* The % the same size as the number (owner, 2026-09-30: a smaller one "looks small"). */}
      <span className="text-[11px] font-semibold tabular-nums tracking-tight text-foreground">
        {share === null ? "–" : `${Math.round(filled)}%`}
      </span>
    </span>
  );
}

export function FraudBadge({
  level,
  successRatio,
  totalParcels,
  onClick,
  className,
}: {
  level: FraudRiskLevel;
  successRatio: number | null | undefined;
  totalParcels: number | null | undefined;
  /** Opens the full fraud check; without it the badge only tells. */
  onClick?: () => void;
  className?: string;
}) {
  const t = useTranslations("fraudCheck");
  const name = t(NAME_KEY[level]);
  const known = level !== "new" && successRatio != null && !!totalParcels;
  const share = known ? (successRatio as number) : null;
  const under = known ? t("riskParcelsShort", { count: totalParcels as number }) : t("riskNoParcelsShort");
  const detail = known
    ? t("riskParcels", { count: totalParcels as number, ratio: Math.round(successRatio as number) })
    : t("riskNoParcels");
  const body = (
    <>
      <Ring level={level} share={share} />
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className={cn("text-xs font-semibold", NAME_TONE[level])}>{name}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">{under}</span>
      </span>
    </>
  );
  const classes = cn(
    "inline-flex items-center gap-2.5 rounded-ui py-1 pl-1 pr-3 whitespace-nowrap",
    onClick &&
      "cursor-pointer transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className
  );
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {onClick ? (
            <button
              type="button"
              className={classes}
              aria-label={`${name}: ${detail}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClick();
              }}
            >
              {body}
            </button>
          ) : (
            <span className={classes} aria-label={`${name}: ${detail}`}>
              {body}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          <span className="font-semibold">{name}</span> · {detail}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
