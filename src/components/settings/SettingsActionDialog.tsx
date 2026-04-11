"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SettingsActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  contentClassName?: string;
};

/**
 * Shared layout for Settings modals (Security, Integrations, etc.): viewport
 * margins on mobile, max height with internal scroll, desktop max width ~md.
 */
export function SettingsActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  showCloseButton = true,
  contentClassName,
}: SettingsActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          "flex max-h-[min(90dvh,40rem)] w-[min(100%,calc(100vw-1.25rem))] max-w-md flex-col gap-0 overflow-hidden rounded-card p-0 sm:max-h-[min(88dvh,36rem)] sm:w-full",
          contentClassName
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 pb-4 pt-4 pr-12 sm:px-6 sm:pb-4 sm:pt-6 sm:pr-14">
          <DialogTitle className="text-left text-base font-semibold leading-snug">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-left text-sm leading-normal">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
        {footer ? (
          <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:px-6 sm:py-4">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
