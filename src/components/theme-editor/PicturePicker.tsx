"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditorSheet } from "@/components/theme-editor/EditorSheet";
import { uploadFile, validateUploadFile } from "@/hooks/usePresignedUpload";
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
  onPick: (picture: ThemeImage) => void;
};

export function PicturePicker({ open, onClose, used, current, onPick }: PicturePickerProps) {
  const t = useTranslations("themeEditor");
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
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

  return (
    <EditorSheet open={open} onClose={onClose} title={t("pictureTitle")} hint={t("pictureHint")}>
      <div className="space-y-4">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
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
                      className="aspect-[4/3] w-full bg-muted object-cover"
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
