import { CircleCheck, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { SHOP_KINDS, formatTaka, heroPhoto, productPhoto } from "@/components/shop-preview/samples";
import { cn } from "@/lib/utils";

/**
 * The wall behind sign in and sign up (owner's pick of five, 2026-09-28: "A · Shop wall"): the
 * sample shops' photos in six tilted columns, drifting up and down at their own speeds, with a
 * few of the notes a running shop gets tucked in among them. Motion is the columns' own transform
 * (`.pb-wall-*`, globals.css), so it stays smooth and costs the page nothing; a device that asks
 * for less motion gets the same wall, standing still.
 */

const PHOTOS = SHOP_KINDS.flatMap((kind) => [
  heroPhoto(kind),
  productPhoto(kind, 1),
  productPhoto(kind, 2),
  productPhoto(kind, 3),
]);

const HEIGHTS = [260, 200, 300, 230, 280, 210, 250];
const SPEEDS = [70, 85, 60, 78, 92, 66];
const PER_COLUMN = 7;

type Tile = { photo: string; height: number } | { note: 0 | 1 | 2; height: number };

/** Each column's tiles: photos spread over the columns, a note in every other column. */
function column(c: number): Tile[] {
  return Array.from({ length: PER_COLUMN }, (_, i) => {
    if (i === 2 && c % 2 === 0) return { note: ((c / 2) % 3) as 0 | 1 | 2, height: 118 };
    return { photo: PHOTOS[(c * 5 + i * 3) % PHOTOS.length], height: HEIGHTS[(i + c) % HEIGHTS.length] };
  });
}

function Note({ note }: { note: 0 | 1 | 2 }) {
  const t = useTranslations("auth.wall");
  const locale = useLocale();
  const line = "text-[12px] text-[#64748b]";
  const big = "text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]";
  if (note === 0) {
    return (
      <>
        <CircleCheck className="size-[18px] text-[#15803d]" aria-hidden />
        <span className={line}>{t("newOrder", { number: 1042 })}</span>
        <b className={big}>{formatTaka(2450, locale)}</b>
      </>
    );
  }
  if (note === 1) {
    return (
      <>
        <span className={line}>{t("todaysSales")}</span>
        <b className={big}>{formatTaka(48250, locale)}</b>
        <span className="text-[11px] text-[#15803d]">{t("salesUp")}</span>
      </>
    );
  }
  return (
    <>
      <Truck className="size-[18px] text-[#15803d]" aria-hidden />
      <span className={line}>{t("parcelBooked")}</span>
      <b className="text-[15px] font-semibold text-[#0f172a]">{t("parcelWhere")}</b>
    </>
  );
}

/**
 * `shade`: how the wall is dimmed. The panel beside the form (the owner's design, 2026-09-28) is
 * darkest at its foot, where its words sit.
 */
const SHADES = {
  center: "bg-[radial-gradient(60%_70%_at_50%_50%,rgb(13_14_17/0.35),rgb(13_14_17/0.88)_75%)]",
  panel: "bg-[linear-gradient(to_top,rgb(14_14_14/0.94),rgb(14_14_14/0.5)_50%,rgb(14_14_14/0.6))]",
} as const;

export function ShopWall({ className, shade = "center" }: { className?: string; shade?: keyof typeof SHADES }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -inset-x-[18%] -inset-y-[30%] flex -rotate-[9deg] gap-4 max-sm:-inset-x-[40%] max-sm:gap-2.5">
        {SPEEDS.map((speed, c) => {
          const tiles = column(c);
          return (
            <div
              key={c}
              className={cn(
                "flex flex-1 flex-col gap-4 will-change-transform max-sm:gap-2.5",
                c % 2 === 0 ? "pb-wall-up" : "pb-wall-down"
              )}
              style={{ animationDuration: `${speed}s` }}
            >
              {/* Twice over, so the loop has no seam: the column travels exactly half its length. */}
              {[...tiles, ...tiles].map((tile, i) =>
                "photo" in tile ? (
                  <div key={i} className="shrink-0 overflow-hidden rounded-card bg-[#1c1d22]" style={{ height: tile.height }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized sample photo */}
                    <img src={tile.photo} alt="" className="size-full object-cover" decoding="async" />
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex shrink-0 flex-col justify-center gap-1 rounded-card bg-white px-3.5"
                    style={{ height: tile.height }}
                  >
                    <Note note={tile.note} />
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
      <div className={cn("absolute inset-0", SHADES[shade])} />
    </div>
  );
}
