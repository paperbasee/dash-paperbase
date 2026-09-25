"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { HELP, LABEL, PICTURE } from "./styles";

/** Words drawn ON a picture, as the shop draws them: a heading, a line, a button. */
export type KitPictureWords = { heading?: string; line?: string; button?: string };

/**
 * A picture setting, shown as the picture (2026-09-26).
 *
 * A merchant recognises their picture, not its file name, so it is drawn big,
 * with Replace and Remove on it -- and, where the picture carries words, with
 * the words on it the way the shop lays them, so what is being edited is what
 * a shopper will see. With none yet, a soft empty frame that is itself the
 * button that chooses one.
 */
export function KitPicture({
  label,
  help,
  url,
  words,
  wide = false,
  onChoose,
  onRemove,
}: {
  label?: ReactNode;
  help?: ReactNode;
  /** Where the picture is drawn from; empty for none. */
  url: string;
  words?: KitPictureWords;
  /** A band across the page rather than a tile: a wider frame. */
  wide?: boolean;
  onChoose: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("themeEditor.kit");
  const frame = wide ? "aspect-[21/9]" : "aspect-[16/10]";
  const said = words && (words.heading || words.line || words.button);

  return (
    <div className="flex flex-col gap-2">
      {label ? <p className={LABEL}>{label}</p> : null}
      {url ? (
        <div className={cn(PICTURE, frame)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a merchant upload on a
              bucket the dashboard configures no loader for */}
          <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
          {said ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent px-3.5 pb-3 pt-10 text-white">
              {words?.heading ? <p className="text-[14px] font-semibold leading-tight">{words.heading}</p> : null}
              {words?.line ? <p className="mt-0.5 text-[11.5px] leading-snug text-white/85">{words.line}</p> : null}
              {words?.button ? (
                <span className="mt-2 inline-block rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold text-black">
                  {words.button}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={onChoose}
              className="rounded-full bg-white/92 px-3 py-1 text-[12px] font-medium text-neutral-900 shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
            >
              {t("replace")}
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={t("removePicture")}
              title={t("removePicture")}
              className="grid size-7 place-items-center rounded-full bg-white/92 text-neutral-900 shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onChoose}
          className={cn(
            PICTURE,
            frame,
            "grid place-items-center border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
          )}
        >
          <span className="flex flex-col items-center gap-1.5 text-[12.5px] font-medium">
            <ImagePlus className="size-5" aria-hidden />
            {t("choosePicture")}
          </span>
        </button>
      )}
      {help ? <p className={HELP}>{help}</p> : null}
    </div>
  );
}
