"use client";

import { ShieldCheckIcon } from "@phosphor-icons/react";
import { Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { KEY_TROUBLE_WORDS, type FraudKeyTrouble } from "./FraudBadge";

type FraudCheckButtonProps = {
  loading: boolean;
  disabled?: boolean;
  locked?: boolean;
  /** The shop's own fraud key fails (phase 5a): this order was not checked, and is said why. */
  keyTrouble?: FraudKeyTrouble;
  onClick: () => void;
  className?: string;
};

export function FraudCheckButton({
  loading,
  disabled,
  locked,
  keyTrouble = null,
  onClick,
  className,
}: FraudCheckButtonProps) {
  const t = useTranslations("fraudCheck");
  const isDisabled = Boolean(disabled || loading || locked);
  const label = locked ? t("premiumButton") : t("button");
  const warning = !locked && keyTrouble ? t(KEY_TROUBLE_WORDS[keyTrouble]) : null;
  const tooltip = locked ? t("premiumTooltip") : (warning ?? t("buttonTooltip"));
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-9 gap-2 px-3 text-xs", warning && "border-red-500/40 text-red-700 dark:text-red-400", className)}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            aria-busy={loading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (locked) return;
              onClick();
            }}
          >
            {loading ? (
              <Spinner className="size-3.5" />
            ) : locked ? (
              <Lock className="size-3.5" />
            ) : warning ? (
              <TriangleAlert className="size-3.5" aria-hidden />
            ) : (
              <ShieldCheckIcon className="size-3.5" weight="bold" />
            )}
            <span>{label}</span>
            {warning ? <span className="sr-only">{warning}</span> : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

