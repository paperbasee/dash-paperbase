"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
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
          "gap-0 p-0",
          wide
            ? "w-80 sm:max-w-none xl:w-[360px]"
            : cn("pb-[env(safe-area-inset-bottom)]", tall ? "h-dvh max-h-dvh rounded-none" : "max-h-[85dvh]"),
        )}
      >
        <SheetHeader className="flex-row items-start justify-between gap-2 border-b border-border">
          <div className="min-w-0 space-y-1">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{hint}</SheetDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2 size-11 md:size-9"
            aria-label={tCommon("close")}
            onClick={onClose}
          >
            <X aria-hidden />
          </Button>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
