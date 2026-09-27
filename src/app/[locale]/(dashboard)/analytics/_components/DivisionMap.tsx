"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import { DIVISION_SHAPES, MAP_BOX } from "../_lib/bangladesh-map";
import type { DivisionRow } from "../_lib/types";

/** How strongly the page's blue fills the division with the least, and the one with the most. */
const LIGHTEST = 0.12;
const DARKEST = 0.9;
/** A division with no orders: grey, still visible on the white card. */
const EMPTY = "hsl(var(--muted-foreground) / 0.14)";

/**
 * Bangladesh's eight divisions on their real borders, each filled by the number
 * shown -- the darker, the more. Pointing at a division names it and its
 * number; choosing one shows its districts, as the list does.
 *
 * Counts and money are shaded from nothing up to the most; a rate (the
 * delivered share) from the lowest to the highest, or every division would
 * look alike.
 */
export function DivisionMap({
  divisions,
  value,
  shown,
  named,
  rate,
  selected,
  onSelect,
}: {
  divisions: DivisionRow[];
  value: (row: DivisionRow) => number;
  shown: (row: DivisionRow) => string;
  named: (row: { name: string; name_bn: string }) => string;
  /** The number is a rate: shade between the lowest and the highest. */
  rate: boolean;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const t = useTranslations("analyticsPage");
  const title = useId();
  const [pointed, setPointed] = useState<string | null>(null);
  const byKey = Object.fromEntries(divisions.map((row) => [row.key, row]));
  const values = divisions.filter((row) => row.orders).map(value);
  const high = Math.max(...values, 0);
  const low = rate ? Math.min(...values, high) : 0;

  const fill = (row: DivisionRow | undefined) => {
    if (!row?.orders || !high) return EMPTY;
    const share = high > low ? (value(row) - low) / (high - low) : 1;
    return `hsl(var(--accent-blue) / ${(LIGHTEST + (DARKEST - LIGHTEST) * share).toFixed(3)})`;
  };
  const focus = byKey[pointed ?? selected ?? ""];

  return (
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${MAP_BOX.width} ${MAP_BOX.height}`}
        role="img"
        aria-labelledby={title}
        className="mx-auto h-auto w-full max-w-[22rem]"
        onMouseLeave={() => setPointed(null)}
      >
        <title id={title}>{t("districts.mapTitle")}</title>
        {Object.entries(DIVISION_SHAPES).map(([key, shape]) => (
          <path
            key={key}
            d={shape.path}
            fill={fill(byKey[key])}
            stroke="hsl(var(--card))"
            strokeWidth={1.2}
            strokeLinejoin="round"
            className="cursor-pointer transition-[fill] duration-150"
            onMouseEnter={() => setPointed(key)}
            onClick={() => onSelect(selected === key ? null : key)}
          />
        ))}
        {selected && DIVISION_SHAPES[selected] ? (
          <path
            d={DIVISION_SHAPES[selected].path}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        ) : null}
        {Object.entries(DIVISION_SHAPES).map(([key, shape]) =>
          byKey[key] ? (
            <text
              key={key}
              x={shape.label[0]}
              y={shape.label[1]}
              textAnchor="middle"
              dominantBaseline="middle"
              stroke="hsl(var(--card))"
              strokeWidth={3}
              paintOrder="stroke"
              className="pointer-events-none select-none fill-foreground text-[13px] font-medium"
            >
              {named(byKey[key])}
            </text>
          ) : null,
        )}
      </svg>

      <p aria-live="polite" className="min-h-5 text-center text-[13px] text-foreground">
        {focus ? (
          <>
            <span className="font-semibold">{named(focus)}</span> · <span className="tabular-nums">{shown(focus)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{t("districts.tapDivision")}</span>
        )}
      </p>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          {rate ? t("districts.scale.lower") : t("districts.scale.less")}
          <span
            aria-hidden
            className="h-2 w-24 rounded-full"
            style={{
              background: `linear-gradient(to right, hsl(var(--accent-blue) / ${LIGHTEST}), hsl(var(--accent-blue) / ${DARKEST}))`,
            }}
          />
          {rate ? t("districts.scale.higher") : t("districts.scale.more")}
        </span>
        <span>{t("districts.mapCredit")}</span>
      </figcaption>
    </figure>
  );
}
