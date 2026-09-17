"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/*
 * The panel the editor opens over its left column: the list to add from, and the link picker.
 *
 * One shell for all of them, because the chrome is the same choice every time — where it comes
 * from, how wide it is, and the close button a phone needs to be able to hit. Each one fills in
 * its own body.
 */

const WIDE = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Wider screens slide a panel over the editor's left column; phones get it from the bottom. */
export function useWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
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
        side={wide ? "left" : "bottom"}
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
