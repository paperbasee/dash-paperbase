"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { FACES, PALETTES, type Face, type Palette } from "./style-catalogue";

/**
 * Which face each specimen is set in.
 *
 * The families are declared in the root layout as CSS variables, with
 * `preload: false` -- `next/font` only runs on a server component module, and
 * declaring them there costs other pages nothing because the files are fetched
 * only where a rule uses one, which is here.
 *
 * Poppins is the dashboard's own face and needs no class.
 */
const FACE_FAMILY: Record<string, string> = {
  poppins: "",
  archivo: "[font-family:var(--font-archivo)]",
  playfair: "[font-family:var(--font-playfair)]",
  cinzel: "[font-family:var(--font-cinzel)]",
  "noto-bengali": "[font-family:var(--font-noto-sans-bengali)]",
};

/**
 * Colour and type: the half of a shop's look that is not a slot.
 *
 * With one theme and fixed places, this panel is what actually makes two shops
 * look different. It is not a nice-to-have beside the canvas -- it is the main
 * lever, which is why it takes the left two fifths of the editor rather than a
 * tab somewhere.
 *
 * **Picking a face picks the language.** There is no language control, by the
 * owner's decision on 2026-09-20: a shop chooses a face and the language
 * follows. The list says so at the point of choosing rather than in a note
 * somewhere, because the consequence is large -- the words on every button, the
 * date format, the digits, and the `/en/` or `/bn/` in every address.
 */

function Swatches({ palette }: { palette: Palette }) {
  const order: (keyof Palette)[] = ["background", "muted", "border", "accent", "foreground"];
  return (
    <span className="flex overflow-hidden rounded-xs" aria-hidden>
      {order.map((role) => (
        <span key={role} className="h-9 flex-1" style={{ backgroundColor: palette[role] as string }} />
      ))}
    </span>
  );
}

function PaletteCard({
  palette,
  chosen,
  onPick,
}: {
  palette: Palette;
  chosen: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onPick}
      className={cn(
        "flex flex-col gap-2 rounded-sm border p-2 text-left transition-colors",
        "hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        chosen ? "border-primary ring-1 ring-inset ring-primary" : "border-border-subtle",
      )}
    >
      <Swatches palette={palette} />
      <span className="flex items-center gap-1.5 text-xs font-medium">
        {chosen ? <Check className="size-3 shrink-0 text-primary" aria-hidden /> : null}
        {t(palette.label)}
      </span>
    </button>
  );
}

function FaceRow({
  face,
  chosen,
  onPick,
}: {
  face: Face;
  chosen: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onPick}
      className={cn(
        "flex w-full flex-col gap-1 rounded-sm border px-3 py-2.5 text-left transition-colors",
        "hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        chosen ? "border-primary ring-1 ring-inset ring-primary" : "border-border-subtle",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className={cn("truncate text-[15px]", FACE_FAMILY[face.key])}>{face.specimen}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{face.name}</span>
      </span>
      <span className="text-[11px] text-muted-foreground">{t(face.note)}</span>
    </button>
  );
}

export function StylePanel({
  palette,
  onPalette,
  face,
  onFace,
}: {
  palette: string;
  onPalette: (key: string) => void;
  face: string;
  onFace: (key: string) => void;
}) {
  const t = useTranslations("themeEditor.slots");
  const current = FACES.find((f) => f.key === face) ?? FACES[0];

  const group = (language: Face["language"]) => FACES.filter((f) => f.language === language);

  return (
    <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-4">
      <section>
        <h3 className="mb-1 text-[13px] font-semibold">{t("colours")}</h3>
        <p className="mb-3 text-xs text-muted-foreground">{t("coloursNote")}</p>
        <div className="grid grid-cols-2 gap-2">
          {PALETTES.map((item) => (
            <PaletteCard
              key={item.key}
              palette={item}
              chosen={palette === item.key}
              onPick={() => onPalette(item.key)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-[13px] font-semibold">{t("type")}</h3>
        {/* The consequence, at the point of choosing rather than in a note elsewhere. */}
        <p className="mb-3 text-xs text-muted-foreground">{t("typeNote")}</p>

        <div className="flex flex-col gap-3">
          {(["en", "bn"] as const).map((language) => (
            <div key={language}>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                {t(language === "en" ? "facesEnglish" : "facesBengali")}
              </p>
              <div className="flex flex-col gap-1.5">
                {group(language).map((item) => (
                  <FaceRow
                    key={item.key}
                    face={item}
                    chosen={face === item.key}
                    onPick={() => onFace(item.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* What a merchant does not choose, said plainly rather than discovered. */}
        <p className="mt-3 rounded-sm bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
          {t("pairedWith", { face: current.pairedWith })}
        </p>
      </section>
    </div>
  );
}
