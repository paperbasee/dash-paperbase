"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  isEmpty,
  SLOTS,
  type OptionShape,
  type Slot,
  type SlotOption,
  type SlotPageKey,
} from "@/lib/theme-editor/slot-catalogue";
import { ShopChrome } from "./ShopChrome";

/**
 * The page IS the editor.
 *
 * There is no list beside the canvas: a merchant clicks the thing they want to
 * change, where it sits, and the choices open underneath it. That is the whole
 * interaction, and it is why the shop is drawn as a shop rather than as grey
 * bars -- you cannot click the thing you want if you cannot recognise it.
 *
 * Three kinds of place, told apart before the click rather than after it:
 *
 *   a place you fill      a tab in the accent, and choices when clicked
 *   a place that is set   a tab with a lock; clicking says WHY, which is not
 *                         the same as doing nothing
 *   a place from elsewhere the header and footer, drawn here so the page reads
 *                         whole, edited once from the page picker
 *
 * An empty place draws itself as empty rather than collapsing, because a slot a
 * merchant cannot see is a slot they will never fill.
 */

/** The little wireframe on an option's tile: the shape it makes, not a picture of it. */
function OptionShapeMark({ shape }: { shape: OptionShape }) {
  if (shape === "blank") {
    return <span className="block h-12 rounded-xs bg-muted" aria-hidden />;
  }
  if (shape === "block") {
    return <span className="block h-12 rounded-xs bg-muted-foreground/20" aria-hidden />;
  }
  if (shape === "row") {
    return (
      <span className="flex h-12 gap-1 rounded-xs bg-muted p-2" aria-hidden>
        <span className="flex-1 rounded-[2px] bg-muted-foreground/20" />
        <span className="flex-1 rounded-[2px] bg-muted-foreground/20" />
      </span>
    );
  }
  return (
    <span className="flex h-12 flex-col justify-center gap-1.5 rounded-xs bg-muted px-2" aria-hidden>
      <span className="h-1 rounded-full bg-muted-foreground/25" />
      <span className="h-1 rounded-full bg-muted-foreground/25" />
      <span className="h-1 w-1/2 rounded-full bg-muted-foreground/25" />
    </span>
  );
}

function OptionTile({
  option,
  chosen,
  onPick,
}: {
  option: SlotOption;
  chosen: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={(event) => {
        event.stopPropagation();
        onPick();
      }}
      className={cn(
        "flex flex-col gap-2.5 rounded-sm border p-3 text-left transition-colors",
        "hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        chosen ? "border-primary ring-1 ring-inset ring-primary" : "border-border-subtle",
      )}
    >
      <OptionShapeMark shape={option.shape} />
      <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
        {t(option.label)}
        {option.premium ? (
          <span className="accent-yellow rounded-[4px] bg-[hsl(var(--accent-yellow)/0.14)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em]">
            {t("premium")}
          </span>
        ) : null}
      </span>
      {option.note ? <span className="text-[11.5px] leading-relaxed text-muted-foreground">{t(option.note)}</span> : null}
    </button>
  );
}

/** The choices, opened in place under the slot they belong to. */
function Chooser({
  slot,
  value,
  onPick,
  onDone,
}: {
  slot: Slot;
  value: string | undefined;
  onPick: (next: string) => void;
  onDone: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  return (
    <div
      className="border-t border-border bg-card px-4 py-4 text-card-foreground"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <strong className="text-sm font-semibold">
          {slot.locked ? t("thisOneIsSet") : t("whatGoesHere")}
        </strong>
        <span className="text-xs text-muted-foreground">{t(slot.label)}</span>
        <button
          type="button"
          onClick={onDone}
          className="ml-auto rounded-xs px-1 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {t("done")}
        </button>
      </div>

      {slot.hint ? (
        <p className="m-0 mb-3.5 max-w-prose text-[12.5px] leading-relaxed text-muted-foreground">{t(slot.hint)}</p>
      ) : null}

      {slot.locked ? (
        <p className="m-0 max-w-prose text-[13px] leading-relaxed text-muted-foreground">{t(slot.lockedBecause ?? "lockedWhy")}</p>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(148px,1fr))]">
          {slot.options?.map((option) => (
            <OptionTile
              key={option.value}
              option={option}
              chosen={value === option.value}
              onPick={() => onPick(option.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One place on the page: the tab that names it, and what it is showing.
 *
 * The chooser is NOT drawn here. A place in a row has to open its choices under
 * the whole row rather than under its own half, or the tiles get a 150px column
 * to live in and the merchant chooses blind.
 */
function SlotRegion({
  slot,
  page,
  value,
  isOpen,
  onActivate,
  settings,
  className,
  children,
}: {
  slot: Slot;
  page: SlotPageKey;
  value: string | undefined;
  isOpen: boolean;
  onActivate: () => void;
  settings: Record<string, string>;
  className?: string;
  /** The chooser, when this place is on its own and can hold it. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("themeEditor.slots");
  const blank = isEmpty(slot, value);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onClick={onActivate}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onActivate();
      }}
      className={cn(
        "group relative min-w-0 cursor-pointer border-2 border-transparent outline-none",
        !slot.locked && "hover:border-primary hover:bg-primary/5",
        slot.locked && "hover:border-border-hover hover:bg-muted/50",
        isOpen && !slot.locked && "border-primary bg-primary/5",
        isOpen && slot.locked && "border-border-hover bg-muted/50",
        "focus-visible:border-primary",
        className,
      )}
    >
      {/*
        The tab that names the place, and says what kind it is.

        Each fill takes ITS OWN paired ink, never a literal. `text-white` here
        read as white-on-white the moment the dashboard was in dark mode, where
        `--primary` is 96% lightness -- the tab was there, the name was not. A
        fill and its text have to come from the same pair or one theme gets a
        label it cannot read. `muted-foreground` is a text colour being used as
        a fill, so its pair is the page's own ground.
      */}
      <span
        className={cn(
          "pointer-events-none absolute -left-px -top-px z-10 inline-flex items-center gap-1 rounded-br-sm px-1.5 py-1",
          "text-[10px] font-medium tracking-[0.02em] opacity-0 transition-opacity",
          "group-hover:opacity-100",
          isOpen && "opacity-100",
          slot.inherited || slot.locked
            ? "bg-muted-foreground text-background"
            : "bg-primary text-primary-foreground",
        )}
      >
        {slot.locked ? <Lock className="size-2.5" aria-hidden /> : null}
        {t(slot.label)}
        {slot.inherited ? ` · ${t("editOnEveryPage")}` : null}
      </span>

      {blank ? (
        <div
          className="grid h-full place-items-center py-9 text-center"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 8px, var(--color-border-subtle) 8px, var(--color-border-subtle) 9px)",
          }}
        >
          <span className="rounded-full bg-background px-3 py-1.5 text-xs text-muted-foreground">
            {t(slot.emptyLabel ?? "nothingHere")}
          </span>
        </div>
      ) : (
        <ShopChrome page={page} slotKey={slot.key} variant={value} settings={settings} />
      )}

      {children}
    </div>
  );
}

/**
 * Consecutive slots that name the same `row` are one band; everything else is
 * its own. Inside a band, slots that name the same `stack` are one column of
 * it, so a band is columns of places rather than places.
 */
function bandsOf(slots: Slot[]): Slot[][][] {
  const bands: Slot[][][] = [];
  for (const slot of slots) {
    const band = bands[bands.length - 1];
    const sameRow = slot.row && band?.[0]?.[0]?.row === slot.row;
    if (!sameRow) {
      bands.push([[slot]]);
      continue;
    }
    const column = band[band.length - 1];
    if (slot.stack && column[0].stack === slot.stack) column.push(slot);
    else band.push([slot]);
  }
  return bands;
}

export function SlotCanvas({
  page,
  device,
  open,
  onOpen,
  choices,
  onChoose,
  allChoices,
  onGoToPage,
}: {
  page: SlotPageKey;
  device: "desktop" | "mobile";
  open: string | null;
  onOpen: (slotKey: string | null) => void;
  choices: Record<string, string>;
  onChoose: (slotKey: string, value: string) => void;
  /**
   * Every page's settings, so an inherited slot can read the one that actually
   * drives it -- `slot.inheritedFrom` says which page and which key. Merging
   * them into one object does not work: the header and the footer both call
   * their arrangement `layout`.
   */
  allChoices: Record<SlotPageKey, Record<string, string>>;
  /** Clicking an inherited slot goes to the entry that owns it. */
  onGoToPage: (page: SlotPageKey, slotKey: string) => void;
}) {
  return (
    <div className="flex justify-center bg-muted/40 p-2 sm:p-3">
      <div
        className={cn(
          "w-full overflow-hidden rounded-sm border border-border-subtle bg-background text-foreground transition-[max-width]",
          device === "mobile" ? "max-w-[320px]" : "max-w-none",
        )}
      >
        {bandsOf(SLOTS[page]).map((band) => {
          /** An inherited place is edited where it lives; everything else opens here. */
          const activate = (slot: Slot) => () => {
            const source = slot.inheritedFrom;
            if (source) onGoToPage(source.page, source.key);
            else onOpen(open === slot.key ? null : slot.key);
          };
          const valueOf = (slot: Slot) =>
            slot.inheritedFrom
              ? allChoices[slot.inheritedFrom.page]?.[slot.inheritedFrom.key]
              : choices[slot.key];
          const settingsOf = (slot: Slot) =>
            slot.inheritedFrom ? (allChoices[slot.inheritedFrom.page] ?? {}) : choices;

          const opened = band.flat().find((slot) => open === slot.key);
          const chooser = opened ? (
            <Chooser
              slot={opened}
              value={valueOf(opened)}
              onPick={(next) => onChoose(opened.key, next)}
              onDone={() => onOpen(null)}
            />
          ) : null;

          // A lone place keeps its choices inside its own outline.
          if (band.length === 1 && band[0].length === 1) {
            const slot = band[0][0];
            return (
              <SlotRegion
                key={slot.key}
                slot={slot}
                page={page}
                value={valueOf(slot)}
                isOpen={open === slot.key}
                onActivate={activate(slot)}
                settings={settingsOf(slot)}
              >
                {chooser}
              </SlotRegion>
            );
          }

          // Side by side, as the page itself has them -- and stacked on a phone,
          // which is also what the page itself does.
          return (
            <div key={band[0][0].row}>
              <div
                className={cn("grid", device === "mobile" ? "" : "sm:[grid-template-columns:var(--slot-cols)]")}
                style={
                  {
                    "--slot-cols": band.map((col) => `minmax(0,${col[0].span ?? 1}fr)`).join(" "),
                  } as React.CSSProperties
                }
              >
                {band.map((column) => (
                  <div key={column[0].key} className="flex min-w-0 flex-col">
                    {column.map((slot) => (
                      <SlotRegion
                        key={slot.key}
                        slot={slot}
                        page={page}
                        value={valueOf(slot)}
                        isOpen={open === slot.key}
                        onActivate={activate(slot)}
                        settings={settingsOf(slot)}
                      />
                    ))}
                  </div>
                ))}
              </div>
              {chooser}
            </div>
          );
        })}
      </div>
    </div>
  );
}
