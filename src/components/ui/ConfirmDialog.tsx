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
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const busy = isConfirmLoading;
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
          "w-[min(100%,calc(100vw-2.5rem))] max-w-[380px] gap-0 rounded-2xl border border-border/80 p-0 sm:max-w-[420px]",
          "bg-white text-zinc-900 shadow-[0_20px_40px_-22px_rgba(15,23,42,0.5)]",
          "dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_20px_40px_-22px_rgba(0,0,0,0.7)]",
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

        <div className="flex items-center justify-center gap-2.5 px-5 pb-6.5 sm:gap-3 sm:px-8 sm:pb-8">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
            className={cn(
              "h-10 min-w-28 rounded-full border-zinc-400/70 bg-transparent px-5 text-base font-medium text-zinc-800 shadow-sm sm:h-11 sm:min-w-32 sm:px-6 sm:text-lg",
              "hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800",
            )}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            loading={busy}
            onClick={onConfirm}
            className={cn(
              "h-10 min-w-28 rounded-full px-5 text-base font-semibold shadow-sm sm:h-11 sm:min-w-32 sm:px-6 sm:text-lg",
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
