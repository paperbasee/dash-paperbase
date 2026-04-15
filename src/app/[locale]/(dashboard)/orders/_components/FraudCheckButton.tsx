"use client";

import { Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type FraudCheckButtonProps = {
  loading: boolean;
  disabled?: boolean;
  locked?: boolean;
  onClick: () => void;
  className?: string;
};

export function FraudCheckButton({
  loading,
  disabled,
  locked,
  onClick,
  className,
}: FraudCheckButtonProps) {
  const isDisabled = Boolean(disabled || loading || locked);
  const label = locked ? "Premium Feature" : "Check";
  const tooltip = locked ? "Available in Premium plan" : "Check fraud history";
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-8 gap-1 px-2.5 text-xs", className)}
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
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            <span>{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

