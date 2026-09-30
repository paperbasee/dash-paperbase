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
 * and kept it (engine/apps/fraud_check/risk.py): green safe, yellow caution or new, red risky.
 * The words say what the colour means; the number is the share of the customer's parcels that
 * were delivered, everywhere.
 */

const TONE: Record<FraudRiskLevel, string> = {
  safe: "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  caution: "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  new: "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  risky: "border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

const DOT: Record<FraudRiskLevel, string> = {
  safe: "bg-emerald-500",
  caution: "bg-amber-500",
  new: "bg-amber-500",
  risky: "bg-red-500",
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
  const short = level === "new" || successRatio == null ? name : `${Math.round(successRatio)}%`;
  const detail =
    level === "new" || !totalParcels
      ? t("riskNoParcels")
      : t("riskParcels", { count: totalParcels, ratio: Math.round(successRatio ?? 0) });
  const body = (
    <>
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[level])} aria-hidden />
      <span>{short}</span>
    </>
  );
  const classes = cn(
    "inline-flex h-7 items-center gap-1.5 rounded-ui border px-2.5 text-xs font-semibold whitespace-nowrap",
    TONE[level],
    onClick && "transition hover:brightness-95",
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
