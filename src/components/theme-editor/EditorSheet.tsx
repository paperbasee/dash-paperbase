"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { HELP, ROUND } from "./kit/styles";
import { useMediaQuery } from "./useMediaQuery";

/*
 * The picker the editor opens over its side panel: a picture, a link, products, a list to tick.
 * From the right on a computer -- where the panel that asked for it stands (2026-09-26) -- and
 * from the bottom on a phone.
 *
 * One shell for all of them, because the chrome is the same choice every time — where it comes
 * from, how wide it is, and the close button a phone needs to be able to hit. Each one fills in
 * its own body.
 */

/** Wider screens slide a panel in from the side; phones get it from the bottom. */
export function useWide() {
  return useMediaQuery("(min-width: 768px)");
}

export function EditorSheet({
  open,
  title,
  hint,
  tall = false,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  hint: string;
  /** A phone gets the whole screen, for a body with its own tabs and scrolling. */
  tall?: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  const tCommon = useTranslations("common");
  const wide = useWide();

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn(
          "gap-0 bg-background p-0",
          wide
            ? "w-[380px] sm:max-w-none xl:w-[400px]"
            : cn("pb-[env(safe-area-inset-bottom)]", tall ? "h-dvh max-h-dvh rounded-none" : "max-h-[85dvh]"),
        )}
      >
        {/* The editor kit's header, so a picker reads as part of the panel that opened it. */}
        <SheetHeader className="flex-row items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0 space-y-1">
            <SheetTitle className="text-[15px] font-semibold leading-snug">{title}</SheetTitle>
            <SheetDescription className={HELP}>{hint}</SheetDescription>
          </div>
          <button type="button" className={cn(ROUND, "-mr-1.5 bg-muted/60")} aria-label={tCommon("close")} onClick={onClose}>
            <X className="size-4" aria-hidden />
          </button>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
