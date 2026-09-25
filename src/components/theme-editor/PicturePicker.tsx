"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2 } from "lucide-react";

import { uploadFile, validateUploadFile } from "@/hooks/usePresignedUpload";
import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import type { ThemeImage } from "@/lib/theme-editor/api";
import { cn } from "@/lib/utils";
import { KitNote } from "./kit";
import { CAPTION, HELP, PICTURE } from "./kit/styles";

/*
 * Choosing a picture for one setting: upload a new one, or take one already placed
 * somewhere in this shop's themes.
 *
 * The list is the reason this exists. A design is saved per theme, so a merchant who
 * moves to another theme has to place their pictures again — and placing them must
 * not mean uploading the same photograph a second time.
 *
 * A picture is stored as its KEY and drawn from its URL; both travel together here,
 * because the editor has no way to turn one into the other.
 *
 * Only the body: the side panel frames every picker in one `EditorSheet` (2026-09-26) --
 * this one framed itself too, and two sheets opened on top of each other.
 */

export type PicturePickerProps = {
  open: boolean;
  onClose: () => void;
  /** Pictures this shop has already placed, newest design first. */
  used: ThemeImage[];
  /** The key currently in the setting, so the list can mark it. */
  current: string;
  /**
   * The picture may be an SVG -- the header's logo (2026-09-26). It is uploaded
   * THROUGH the API rather than straight to storage, because an SVG is cleaned of
   * anything that is not drawing before it is kept; a PNG, WebP or JPEG goes the
   * same way, so one logo has one path.
   */
  svg?: boolean;
  onPick: (picture: ThemeImage) => void;
};

/** What a logo may be, and how big: the API's own rules (`theming/logo`), said before the upload. */
const LOGO_TYPES = ["image/svg+xml", "image/png", "image/webp", "image/jpeg"];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
/** The API's reasons, each with words of its own. */
const LOGO_REFUSALS = ["tooBig", "notALogoFile", "svgUnreadable", "svgNotSafe", "svgNoSize", "tooManyPixels"];

async function uploadLogo(file: File): Promise<ThemeImage> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ key: string; url: string }>("theming/editor/logo/", form);
  return { key: data.key, url: data.url };
}

export function PicturePicker({ open, onClose, used, current, svg = false, onPick }: PicturePickerProps) {
  const t = useTranslations("themeEditor");
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Each opening starts clean: a refusal was about the last file, not the next.
  useEffect(() => {
    if (open) setProblem(null);
  }, [open]);

  async function take(file: File | undefined) {
    if (!file) return;
    if (svg) {
      await takeLogo(file);
      return;
    }
    // The same rules the rest of the dashboard uploads by; said before the upload
    // starts rather than after it fails.
    if (validateUploadFile(file)) {
      setProblem(t("pictureBadFile"));
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const { key } = await uploadFile(file, { entity: "theme" });
      // No URL comes back from the upload, and the picker needs one to draw the
      // thumbnail. The list refetches after the save, which is where it gets one.
      onPick({ key, url: "" });
      onClose();
    } catch {
      setProblem(t("pictureUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function takeLogo(file: File) {
    if (!LOGO_TYPES.includes(file.type)) {
      setProblem(t("logoRefused.notALogoFile"));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setProblem(t("logoRefused.tooBig"));
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const picture = await uploadLogo(file);
      onPick(picture);
      onClose();
    } catch (err) {
      const code = isApiHttpError(err) ? (err.response?.data as { code?: unknown } | undefined)?.code : undefined;
      setProblem(
        typeof code === "string" && LOGO_REFUSALS.includes(code)
          ? t(`logoRefused.${code}`)
          : t("pictureUploadFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-8 pt-1">
      <input
        ref={fileInput}
        type="file"
        accept={svg ? LOGO_TYPES.join(",") : "image/jpeg,image/png,image/webp,image/gif"}
        className="sr-only"
        onChange={(event) => {
          void take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {/* A new one: the soft empty frame is the button, as it is in the panel. */}
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
        className={cn(
          PICTURE,
          "grid aspect-[16/7] place-items-center border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-wait",
        )}
      >
        <span className="flex flex-col items-center gap-1.5 text-[13px] font-medium">
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
          {busy ? t("pictureUploading") : t("pictureUpload")}
        </span>
      </button>
      {problem ? <KitNote role="alert">{problem}</KitNote> : null}

      {used.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className={CAPTION}>{t("pictureUsedHeading")}</p>
            <p className={cn(HELP, "mt-1")}>{t("pictureUsedHint")}</p>
          </div>
          <ul className="grid grid-cols-2 gap-2.5">
            {used.map((picture) => (
              <li key={picture.key}>
                <button
                  type="button"
                  aria-current={picture.key === current ? "true" : undefined}
                  className={cn(
                    "block w-full overflow-hidden rounded-card bg-muted transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    picture.key === current
                      ? "shadow-[0_0_0_2px_hsl(var(--foreground))]"
                      : "hover:shadow-[0_0_0_1.5px_hsl(var(--border))]",
                  )}
                  onClick={() => {
                    onPick(picture);
                    onClose();
                  }}
                >
                  {/* Plain img: these are merchant uploads on a bucket the dashboard
                      does not configure for next/image, and they are thumbnails. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={picture.url}
                    alt=""
                    className={cn("aspect-[4/3] w-full", svg ? "object-contain p-3" : "object-cover")}
                    loading="lazy"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={HELP}>{t("pictureNoneYet")}</p>
      )}
    </div>
  );
}
