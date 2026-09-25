"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { KitNote } from "./kit";
import { HELP, PRIMARY, SECONDARY } from "./kit/styles";

/**
 * Two people (or one merchant in two tabs) changed the same theme, and this one's save came back
 * a conflict. There are only two honest answers, so both are buttons and neither is the one a
 * stray tap lands on: there is no close button, no Escape and no backdrop, because sliding out of
 * this would leave the editor unable to save anything at all.
 *
 * Each button says what it costs before it is pressed: "Keep my version" replaces the draft the
 * other one made, and "Load latest" gives up the edits this editor had not sent — it is the
 * button a stray tap lands on, so the sentence is there whenever there is something to lose.
 *
 * The dashboard's own dialog frame -- a question that must be answered is a true dialog, not a
 * panel -- with the editor kit's words and buttons inside it (2026-09-26).
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
          <DialogTitle className="text-[15px] font-semibold">{t("conflictTitle")}</DialogTitle>
          <DialogDescription className={HELP}>{t("conflictMessage")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 px-6 py-4">
          {hasUnsent ? <KitNote>{t("conflictLoadWarning")}</KitNote> : null}
          <KitNote>{t("conflictKeepWarning")}</KitNote>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            className={cn(SECONDARY, "w-full sm:w-auto")}
            disabled={busy || !canKeepMine}
            onClick={onKeepMine}
          >
            {t("conflictKeep")}
          </button>
          <button type="button" className={cn(PRIMARY, "w-full sm:w-auto")} disabled={busy} onClick={onLoadLatest}>
            {t("conflictLoad")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
