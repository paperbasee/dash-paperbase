"use client";

import { useLocale, useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { KitChoice, KitGroup, KitNote, KitPanel } from "../kit";
import { HELP } from "../kit/styles";
import { paletteName, type ShopPalette } from "@/lib/theme-editor/palettes";
import {
  CARD_STYLES,
  CORNERS,
  FACES,
  type CardStyle,
  type Corner,
  type Face,
} from "./style-catalogue";

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
 * lever, which is why it is what the side panel shows whenever nothing on the
 * page is clicked (2026-09-26; it was the left two fifths of the editor), and
 * a button of its own in the top bar where there is no room for a column.
 *
 * **Picking a face picks the language.** There is no language control, by the
 * owner's decision on 2026-09-20: a shop chooses a face and the language
 * follows. The list says so at the point of choosing rather than in a note
 * somewhere, because the consequence is large -- the words on every button, the
 * date format, the digits, and the `/en/` or `/bn/` in every address.
 */

/**
 * A palette as a shopper meets it: the page, its panels, a line, the brand
 * colour the buttons are filled with, and the ink.
 */
function Swatches({ palette }: { palette: ShopPalette }) {
  const order = ["background", "muted", "border", "primary", "foreground"];
  return (
    <span className="flex h-9 overflow-hidden rounded-[8px]">
      {order.map((role) => (
        <span key={role} className="flex-1" style={{ backgroundColor: palette.tokens[role] }} />
      ))}
    </span>
  );
}

/** A face, set in itself. */
function Specimen({ face }: { face: Face }) {
  return <span className={cn("block truncate text-[17px] leading-snug", FACE_FAMILY[face.key])}>{face.specimen}</span>;
}

/** A corner, shown at the size a card would wear it. */
function CornerMark({ corner }: { corner: Corner }) {
  return (
    <span
      className="block h-9 w-full border-2 border-foreground/25 bg-background/70"
      style={{ borderRadius: corner.radius }}
    />
  );
}

/**
 * A product card, drawn small.
 *
 * The difference between the two is what a shopper meets first -- a quiet name
 * and an add mark in the corner, or the price and a button that orders -- so the
 * preview draws that rather than naming it.
 */
function CardMark({ style, corner }: { style: CardStyle; corner: number }) {
  const shelf = style.key === "shelf";
  return (
    <span className="flex flex-col gap-1">
      <span className="relative block h-10 bg-background/70" style={{ borderRadius: corner }}>
        {shelf ? null : (
          <span
            className="absolute bottom-1 right-1 grid size-4 place-items-center bg-foreground/15 text-[10px] leading-none"
            style={{ borderRadius: Math.min(corner, 6) }}
          >
            +
          </span>
        )}
      </span>
      {shelf ? (
        <>
          <span className="block h-1.5 w-1/2 rounded-full bg-foreground/35" />
          <span className="block h-3.5 w-full bg-foreground/20" style={{ borderRadius: Math.min(corner, 6) }} />
        </>
      ) : (
        <>
          <span className="block h-1.5 w-3/4 rounded-full bg-foreground/20" />
          <span className="block h-1.5 w-1/3 rounded-full bg-foreground/15" />
        </>
      )}
    </span>
  );
}

export function StylePanel({
  palettes,
  palettesFailed,
  palette,
  onPalette,
  face,
  onFace,
  corner,
  onCorner,
  cardStyle,
  onCardStyle,
  onClose,
}: {
  /** The six, from the API; undefined while they load. */
  palettes: ShopPalette[] | undefined;
  palettesFailed: boolean;
  palette: string;
  onPalette: (key: string) => void;
  face: string;
  onFace: (key: string) => void;
  corner: string;
  onCorner: (key: string) => void;
  cardStyle: string;
  onCardStyle: (key: string) => void;
  /** Where Style is a sheet over the page (a narrower screen), the way back to the page. */
  onClose?: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  const tKit = useTranslations("themeEditor.kit");
  const locale = useLocale();
  const current = FACES.find((f) => f.key === face) ?? FACES[0];
  const radius = (CORNERS.find((c) => c.key === corner) ?? CORNERS[0]).radius;

  return (
    <KitPanel title={tKit("styleTitle")} hint={tKit("styleHint")} onClose={onClose} className="h-full">
      <KitGroup title={t("colours")}>
        {palettesFailed ? (
          <KitNote role="alert">{t("palettesFailed")}</KitNote>
        ) : palettes ? (
          <KitChoice
            label={t("colours")}
            value={palette}
            onChange={onPalette}
            help={t("coloursNote")}
            options={palettes.map((item) => ({
              value: item.key,
              label: paletteName(item, locale),
              mark: <Swatches palette={item} />,
            }))}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[74px] rounded-[12px]" />
            ))}
          </div>
        )}
      </KitGroup>

      <KitGroup title={t("corners")}>
        <KitChoice
          label={t("corners")}
          value={corner}
          onChange={onCorner}
          help={t("cornersNote")}
          columns={3}
          options={CORNERS.map((item) => ({ value: item.key, label: t(item.label), mark: <CornerMark corner={item} /> }))}
        />
      </KitGroup>

      <KitGroup title={t("cardStyle")}>
        <KitChoice
          label={t("cardStyle")}
          value={cardStyle}
          onChange={onCardStyle}
          options={CARD_STYLES.map((item) => ({
            value: item.key,
            label: t(item.label),
            note: t(item.note),
            mark: <CardMark style={item} corner={radius} />,
          }))}
        />
      </KitGroup>

      {/*
        Type last, and faded: not wired to the shop yet (owner, 2026-09-26:
        "faded out so nobody can click"), shown so a merchant sees what is
        coming. The consequence -- a face picks the language -- is said where
        it would be chosen, not in a note elsewhere.
      */}
      <KitGroup title={t("type")}>
        <KitNote>{t("typeNotSavedYet")}</KitNote>
        <p className={HELP}>{t("typeNote")}</p>
        {(["en", "bn"] as const).map((language) => (
          <KitChoice
            key={language}
            label={t(language === "en" ? "facesEnglish" : "facesBengali")}
            value={face}
            onChange={onFace}
            options={FACES.filter((item) => item.language === language).map((item) => ({
              value: item.key,
              label: item.name,
              mark: <Specimen face={item} />,
              disabled: true,
            }))}
          />
        ))}
        <KitNote>{t("pairedWith", { face: current.pairedWith })}</KitNote>
      </KitGroup>
    </KitPanel>
  );
}
