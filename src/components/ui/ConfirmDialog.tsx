"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = "danger" | "warning" | "default";

export type ConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  isConfirmLoading?: boolean;
  /**
   * When set, the confirm button stays disabled until the user types this exact
   * value. For an action that cannot be undone, a click is too cheap: typing it
   * forces the person to read WHAT they are destroying, not merely that something
   * is about to be. Compared trimmed and case-insensitively -- the point is
   * deliberateness, not a spelling test.
   */
  requireTypedValue?: string;
  /** Label above that input. Callers pass a localized string. */
  typedValueLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isConfirmLoading = false,
  requireTypedValue,
  typedValueLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const busy = isConfirmLoading;
  const [typed, setTyped] = React.useState("");
  // Clear between openings, so one confirmation cannot arm the next.
  React.useEffect(() => {
    if (!isOpen) setTyped("");
  }, [isOpen]);
  const normalise = (value: string) => value.trim().toLowerCase();
  const typedMatches =
    !requireTypedValue || normalise(typed) === normalise(requireTypedValue);
  const confirmButtonTone =
    variant === "danger"
      ? "bg-[#ef7d67] text-white hover:bg-[#e56f58] dark:bg-[#f08b76] dark:text-zinc-950 dark:hover:bg-[#e57f69]"
      : variant === "warning"
        ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
        : "bg-primary text-primary-foreground hover:bg-primary/90";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-[min(100%,calc(100vw-2.5rem))] max-w-[380px] gap-0 rounded-xs border border-border-subtle p-0 sm:max-w-[420px]",
          "bg-background text-foreground",
        )}
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <div className="flex flex-col items-center gap-2.5 px-5 pb-3.5 pt-6 text-center sm:gap-3 sm:px-8 sm:pb-4 sm:pt-9">
          <DialogTitle className="m-0 p-0 text-[1.85rem] font-extrabold leading-none tracking-tight text-foreground sm:text-[2.1rem]">
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <p className="max-w-[30ch] text-[0.98rem] leading-6 text-muted-foreground sm:max-w-[34ch] sm:text-base sm:leading-7">
              {description}
            </p>
          </DialogDescription>
        </div>

          {requireTypedValue ? (
            <div className="px-5 pb-4 sm:px-8">
              <label
                htmlFor="confirm-typed-value"
                className="block text-xs leading-relaxed text-muted-foreground"
              >
                {typedValueLabel}
              </label>
              <input
                id="confirm-typed-value"
                type="text"
                dir="ltr"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && typedMatches && !busy) {
                    e.preventDefault();
                    onConfirm();
                  }
                }}
                disabled={busy}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore
                className={cn(
                  "mt-1.5 h-10 w-full rounded-ui border border-border bg-background px-3 font-mono text-sm text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                  "disabled:opacity-50",
                )}
                placeholder={requireTypedValue}
              />
            </div>
          ) : null}

        <div className="flex items-center justify-center gap-2.5 px-5 pb-6.5 sm:gap-3 sm:px-8 sm:pb-8">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
            className={cn(
              "h-10 min-w-28 px-5 text-base font-medium sm:h-11 sm:min-w-32 sm:px-6 sm:text-lg",
            )}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            loading={busy}
            disabled={!typedMatches}
            onClick={onConfirm}
            className={cn(
              "h-10 min-w-28 px-5 text-base font-semibold sm:h-11 sm:min-w-32 sm:px-6 sm:text-lg",
              confirmButtonTone,
            )}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
