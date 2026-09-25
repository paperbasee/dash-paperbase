"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Hand, Loader2, MousePointerClick, RotateCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { PILL, PILL_ON, PILLS, ROUND, SECONDARY } from "./kit/styles";
import { PREVIEW_FRAME_NAME, type usePreviewSession } from "./usePreviewSession";

type PreviewSession = ReturnType<typeof usePreviewSession>;

/**
 * The editor's page: the shop itself (2026-09-26). The merchant's draft, drawn by the storefront
 * on the private preview host -- their fonts, their colours, the phone layout their shoppers get
 * -- in one frame for the whole editor session. Phone and Computer only change the box's width,
 * because a new frame would need a new pass.
 *
 * It replaced a drawing of the shop (`SlotCanvas`), which could never quite be the shop: the
 * owner compared the two on a phone and asked for the real one.
 *
 * Above it, one line: what the pointer is over, or what the page is, and whether a click picks a
 * place to change (Select) or does what it does for a shopper (Browse) -- opening the phone menu,
 * following a link. Orders are refused in the preview either way.
 */
export function PreviewPane({
  origin,
  width,
  session,
  note,
  status,
  selecting,
  onSelecting,
}: {
  origin: string;
  /** The frame's width: a phone's, or the whole column. */
  width: string;
  session: PreviewSession;
  /** About the page showing: a sample, a page the editor has no places for, a shop with nothing to show. */
  note: ReactNode;
  /** What the pointer is over, when it is over a place. Said instead of the note. */
  status: ReactNode;
  selecting: boolean;
  onSelecting: (next: boolean) => void;
}) {
  const t = useTranslations("themeEditor");
  const { state, frameRef, formRef, reload } = session;
  const { phase } = state;
  const busy = phase === "minting" || phase === "entering" || phase === "loading" || phase === "refreshing";

  let cover: ReactNode = null;
  if (busy && !state.hasShown) {
    cover = (
      <p role="status" className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("previewOpening")}
      </p>
    );
  } else if (phase === "otherStore" || phase === "unavailable") {
    cover = (
      <>
        <p role="alert" className="max-w-sm text-[13px] text-foreground">
          {phase === "otherStore"
            ? t("previewOtherStore")
            : state.mintLimited
              ? t("previewLimited")
              : t("previewUnavailable")}
        </p>
        <button type="button" className={SECONDARY} onClick={reload}>
          {phase === "otherStore" ? t("previewShowHere") : t("previewReload")}
        </button>
      </>
    );
  } else if (phase === "stopped") {
    cover = (
      <p role="alert" className="max-w-sm text-[13px] text-foreground">
        {state.stopReason === "not_entitled" ? t("previewNotEntitled") : t("previewNotAllowed")}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/40">
      <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-1.5 text-[12.5px] text-muted-foreground">
        <div role="status" aria-live="polite" className="flex min-w-0 flex-1 items-center gap-2">
          {busy && state.hasShown ? (
            <>
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
              <span className="truncate">{t("previewUpdating")}</span>
            </>
          ) : (
            (status ?? note)
          )}
        </div>
        <div role="radiogroup" aria-label={t("previewClickDoes")} className={cn(PILLS, "w-auto shrink-0")}>
          {(
            [
              [true, MousePointerClick, t("previewSelect")],
              [false, Hand, t("previewBrowse")],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={selecting === value}
              title={label}
              onClick={() => onSelecting(value)}
              className={cn(PILL, "inline-flex flex-none items-center gap-1.5", selecting === value && PILL_ON)}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">{label}</span>
            </button>
          ))}
        </div>
        {phase !== "stopped" ? (
          <button type="button" className={ROUND} aria-label={t("previewReload")} title={t("previewReload")} onClick={reload}>
            <RotateCw className="size-3.5" aria-hidden />
          </button>
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
