"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PREVIEW_FRAME_NAME, type usePreviewSession } from "./usePreviewSession";

type PreviewSession = ReturnType<typeof usePreviewSession>;

/**
 * The store preview: one frame for the whole editor session. The phone/desktop toggle only
 * changes the box's width, and the Edit/Preview tabs only hide it, because a new frame would
 * need a new pass. On a phone the box is always full width.
 */
export function PreviewPane({
  origin,
  width,
  session,
  note,
}: {
  origin: string;
  width: string;
  session: PreviewSession;
  /** About the page showing: it can't be customized, or the shop has nothing to show for the picked page. */
  note: ReactNode;
}) {
  const t = useTranslations("themeEditor");
  const { state, frameRef, formRef, reload } = session;
  const { phase } = state;
  const busy = phase === "minting" || phase === "entering" || phase === "loading" || phase === "refreshing";

  let cover: ReactNode = null;
  if (busy && !state.hasShown) {
    cover = (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("previewOpening")}
      </p>
    );
  } else if (phase === "otherStore" || phase === "unavailable") {
    cover = (
      <>
        <p role="alert" className="max-w-sm text-sm text-foreground">
          {phase === "otherStore"
            ? t("previewOtherStore")
            : state.mintLimited
              ? t("previewLimited")
              : t("previewUnavailable")}
        </p>
        <Button type="button" variant="outline" onClick={reload}>
          {phase === "otherStore" ? t("previewShowHere") : t("previewReload")}
        </Button>
      </>
    );
  } else if (phase === "stopped") {
    cover = (
      <p role="alert" className="max-w-sm text-sm text-foreground">
        {state.stopReason === "not_entitled" ? t("previewNotEntitled") : t("previewNotAllowed")}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/40">
      <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-1 text-xs text-muted-foreground">
        <div role="status" className="flex min-w-0 flex-1 items-center gap-2">
          {busy && state.hasShown ? (
            <>
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
              <span className="truncate">{t("previewUpdating")}</span>
            </>
          ) : (
            note
          )}
        </div>
        {phase !== "stopped" ? (
          <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 px-2 text-xs" onClick={reload}>
            <RotateCw className="size-3.5" aria-hidden />
            {/* Icon only on a phone, so the note beside it stays readable. */}
            <span className="sr-only sm:not-sr-only">{t("previewReload")}</span>
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 justify-center md:p-4">
        <div
          style={{ "--preview-width": width } as CSSProperties}
          className="relative flex w-full flex-col overflow-hidden bg-background transition-[max-width] duration-300 md:max-w-[var(--preview-width)] md:rounded-card md:border md:border-border"
        >
          <iframe
            ref={frameRef}
            name={PREVIEW_FRAME_NAME}
            title={t("previewFrameTitle")}
            className="block min-h-0 w-full flex-1 border-0 bg-background"
          />
          {cover ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-6 text-center">
              {cover}
            </div>
          ) : null}
        </div>
      </div>

      {/* The entry form: the pass is put in for the moment of the post, then taken out. */}
      <form ref={formRef} method="post" action={`${origin}/api/preview/enter`} target={PREVIEW_FRAME_NAME} hidden>
        <input type="hidden" name="preview_pass" defaultValue="" />
      </form>
    </div>
  );
}
