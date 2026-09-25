"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditorSheet } from "@/components/theme-editor/EditorSheet";
import { uploadFile, validateUploadFile } from "@/hooks/usePresignedUpload";
import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import type { ThemeImage } from "@/lib/theme-editor/api";
import { cn } from "@/lib/utils";

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
    <EditorSheet
      open={open}
      onClose={onClose}
      title={t(svg ? "logoPickerTitle" : "pictureTitle")}
      hint={t(svg ? "logoPickerHint" : "pictureHint")}
    >
      <div className="space-y-4">
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
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full md:h-10"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
          {busy ? t("pictureUploading") : t("pictureUpload")}
        </Button>
        {problem ? (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        ) : null}

        {used.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t("pictureUsedHeading")}</p>
            <p className="text-sm text-muted-foreground">{t("pictureUsedHint")}</p>
            <ul className="grid grid-cols-3 gap-2">
              {used.map((picture) => (
                <li key={picture.key}>
                  <button
                    type="button"
                    className={cn(
                      "block w-full overflow-hidden rounded-ui border",
                      picture.key === current ? "border-foreground" : "border-border",
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
                      className={cn("aspect-[4/3] w-full bg-muted", svg ? "object-contain p-2" : "object-cover")}
                      loading="lazy"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("pictureNoneYet")}</p>
        )}
      </div>
    </EditorSheet>
  );
}
