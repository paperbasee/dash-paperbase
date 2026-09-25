"use client";

import { useLocale, useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { KitBadge, KitChoice, KitGroup, KitNote, KitPanel } from "../kit";
import { CAPTION, HELP } from "../kit/styles";
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
 * look different. It is not a nice-to-have beside the shop -- it is the main
 * lever, which is why it is one of the side panel's two tabs whenever nothing
 * on the page is picked (2026-09-26; it was the left two fifths of the editor).
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
    <span className="flex h-9 overflow-hidden rounded-xs">
      {order.map((role) => (
        <span key={role} className="flex-1" style={{ backgroundColor: palette.tokens[role] }} />
      ))}
    </span>
  );
}

/**
 * A face as a type specimen (owner, 2026-09-26: the preview was "horrible"):
 * one to a row, the sample large and set in the face itself, its name beside
 * it and what it is for under it. Squeezed two to a row as choice cards, the
 * samples were cut off mid-word and the one Bengali face sat in half a row.
 *
 * Not a button: the faces are not wired to the shop yet (owner, 2026-09-26:
 * "faded out so nobody can click"), so they are shown, faded, and nothing about
 * them invites a click.
 */
function FaceSpecimen({ face }: { face: Face }) {
  const t = useTranslations("themeEditor.slots");
  return (
    <li className="flex flex-col gap-1.5 rounded-card bg-muted/50 px-4 py-3.5">
      <span className="flex items-baseline justify-between gap-3">
        <span className={cn("min-w-0 truncate text-[22px] leading-tight text-foreground", FACE_FAMILY[face.key])}>
          {face.specimen}
        </span>
        <span className="shrink-0 text-[11.5px] text-muted-foreground">{face.name}</span>
      </span>
      <span className={HELP}>{t(face.note)}</span>
    </li>
  );
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
  /** The face the shop is set in -- not a choice yet: see the Type group below. */
  face: string;
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
              <Skeleton key={i} className="h-[74px] rounded-card" />
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
        Type last, and faded: not wired to the shop yet, shown so a merchant
        sees what is coming -- said once, as a tag on the heading, rather than
        in a box. The consequence -- a face picks the language -- is said where
        it would be chosen, not in a note elsewhere.
      */}
      <KitGroup title={t("type")} aside={<KitBadge>{tKit("comingSoon")}</KitBadge>}>
        <p className={HELP}>{t("typeNote")}</p>
        <div aria-disabled="true" className="flex flex-col gap-5 opacity-60">
          {(["en", "bn"] as const).map((language) => (
            <div key={language} className="flex flex-col gap-2">
              <p className={CAPTION}>{t(language === "en" ? "facesEnglish" : "facesBengali")}</p>
              <ul className="flex flex-col gap-2">
                {FACES.filter((item) => item.language === language).map((item) => (
                  <FaceSpecimen key={item.key} face={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className={HELP}>{t("pairedWith", { face: current.pairedWith })}</p>
      </KitGroup>
    </KitPanel>
  );
}
