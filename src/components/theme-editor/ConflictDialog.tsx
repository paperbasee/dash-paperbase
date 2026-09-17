"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Two people (or one merchant in two tabs) changed the same theme, and this one's save came back
 * a conflict. There are only two honest answers, so both are buttons and neither is the one a
 * stray tap lands on: there is no close button, no Escape and no backdrop, because sliding out of
 * this would leave the editor unable to save anything at all.
 *
 * Each button says what it costs before it is pressed: "Keep my version" replaces the draft the
 * other one made, and "Load latest" gives up the edits this editor had not sent — it is the
 * button a stray tap lands on, so the sentence is there whenever there is something to lose.
 */
export function ConflictDialog({
  open,
  busy,
  canKeepMine,
  hasUnsent,
  onLoadLatest,
  onKeepMine,
}: {
  open: boolean;
  busy: boolean;
  /** The API named the draft's revision, so this editor can save over exactly that draft. */
  canKeepMine: boolean;
  /** This editor has edits the server never took: loading the latest is what loses them. */
  hasUnsent: boolean;
  onLoadLatest: () => void;
  onKeepMine: () => void;
}) {
  const t = useTranslations("themeEditor");

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="w-[min(100%,calc(100vw-2.5rem))] max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t("conflictTitle")}</DialogTitle>
          <DialogDescription>{t("conflictMessage")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-6 py-4 text-sm text-muted-foreground">
          {hasUnsent ? <p>{t("conflictLoadWarning")}</p> : null}
          <p>{t("conflictKeepWarning")}</p>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:h-9 sm:w-auto"
            disabled={busy || !canKeepMine}
            onClick={onKeepMine}
          >
            {t("conflictKeep")}
          </Button>
          <Button type="button" className="h-11 w-full sm:h-9 sm:w-auto" disabled={busy} onClick={onLoadLatest}>
            {t("conflictLoad")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
