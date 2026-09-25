"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ThemeDocument, ThemeSection } from "@/lib/theme-editor/api";
import { isEmpty, SLOTS, type Slot, type SlotPageKey } from "@/lib/theme-editor/slot-catalogue";
import { ownerOf, sectionFor, slotValueFor, wiringFor } from "@/lib/theme-editor/slot-sections";
import type { FieldOption } from "@/lib/theme-editor/field-specs";
import type { CategoryEntry } from "@/lib/theme-editor/link-targets";
import {
  type BlogPreview,
  type BrandPreview,
  type PolicyPreview,
  type ReviewPreview,
  ShopChrome,
  type ShopIdentity,
} from "./ShopChrome";

/**
 * The page IS the editor.
 *
 * A merchant clicks the thing they want to change, where it sits, and its
 * settings open in the side panel beside the page (on a phone, a sheet from
 * the bottom) -- 2026-09-26; they opened underneath it, then in a pop-up over
 * it, and both hid the page being changed. That is the whole interaction, and
 * it is why the shop is drawn as a shop rather than as grey bars -- you cannot
 * click the thing you want if you cannot recognise it.
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

/**
 * One place on the page: the tab that names it, and what it is showing. Its
 * settings are the side panel's, never drawn here.
 */
function SlotRegion({
  slot,
  page,
  value,
  isOpen,
  onActivate,
  settings,
  live,
  pictureUrl,
  departments,
  categories,
  promiseWords,
  blog,
  shop,
  brands,
  reviews,
  policies,
  footerSection,
  className,
}: {
  slot: Slot;
  page: SlotPageKey;
  value: string | undefined;
  isOpen: boolean;
  onActivate: () => void;
  settings: Record<string, string>;
  /** A wired place's own SECTION, so the drawing shows the merchant's own. */
  live?: ThemeSection;
  pictureUrl?: (key: string) => string;
  departments?: FieldOption[];
  /** Every category by its link, for the header menu's drawing. See ShopChrome. */
  categories?: Record<string, CategoryEntry>;
  /** A promise's name to the words a merchant reads. See ShopChrome. */
  promiseWords?: (name: string) => string;
  /** This shop's own posts and tags, for the blog's drawings. See ShopChrome. */
  blog?: BlogPreview;
  /** This shop's own name, contact and links, for the footer. See ShopChrome. */
  shop?: ShopIdentity;
  /** This shop's brands and good reviews, for the home page. See ShopChrome. */
  brands?: BrandPreview[];
  reviews?: ReviewPreview[];
  /** This shop's policies, for the footer's links. See ShopChrome. */
  policies?: PolicyPreview[];
  /** The footer section, for a place that draws the footer. See ShopChrome. */
  footerSection?: ThemeSection;
  className?: string;
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
        <ShopChrome
          page={page}
          slotKey={slot.key}
          variant={value}
          settings={settings}
          live={live}
          pictureUrl={pictureUrl}
          departments={departments}
          categories={categories}
          promiseWords={promiseWords}
          blog={blog}
          shop={shop}
          brands={brands}
          reviews={reviews}
          policies={policies}
          footerSection={footerSection}
        />
      )}
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
  allChoices,
  document,
  pictureUrl,
  departments,
  categories,
  promiseWords,
  blog,
  shop,
  brands,
  reviews,
  policies,
  footerSection,
  onGoToPage,
  colours,
}: {
  page: SlotPageKey;
  device: "desktop" | "mobile";
  /**
   * The chosen palette as the drawing's colour variables
   * (lib/theme-editor/palettes.ts `canvasColours`), so the sketch repaints the
   * moment a palette is picked. Absent: the dashboard's own colours.
   */
  colours?: Record<string, string>;
  /** The place selected: outlined here, its settings in the side panel. */
  open: string | null;
  onOpen: (slotKey: string | null) => void;
  choices: Record<string, string>;
  /** The shop's own document: what a WIRED place draws from. */
  document: ThemeDocument;
  pictureUrl: (key: string) => string;
  /**
   * This shop's own top-level departments: what the category band draws, and
   * what the three-department place is picked from. One list for both, so the
   * canvas and the panel can never offer different aisles.
   */
  departments: FieldOption[];
  /** Every category by its link, for the header menu's drawing. See ShopChrome. */
  categories?: Record<string, CategoryEntry>;
  /** A promise's name to the words a merchant reads. See ShopChrome. */
  promiseWords?: (name: string) => string;
  /** This shop's own posts and tags, for the blog's drawings. See ShopChrome. */
  blog?: BlogPreview;
  /** This shop's own name, contact and links, for the footer. See ShopChrome. */
  shop?: ShopIdentity;
  /** This shop's brands and good reviews, for the home page. See ShopChrome. */
  brands?: BrandPreview[];
  reviews?: ReviewPreview[];
  /** This shop's policies, for the footer's links. See ShopChrome. */
  policies?: PolicyPreview[];
  /** The footer section, for a place that draws the footer. See ShopChrome. */
  footerSection?: ThemeSection;
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
        style={colours as React.CSSProperties | undefined}
        data-palette-painted={colours ? "" : undefined}
      >
        {bandsOf(SLOTS[page]).map((band) => {
          /**
           * A click selects the place, and the side panel shows its settings --
           * a second click leaves it selected rather than taking the panel away
           * mid-thought; the panel's ✕ does that. A place drawn on every page
           * and still a DRAWING sends the merchant to the entry that owns it; a
           * wired one is edited right here (owner, 2026-09-22), since being sent
           * to Header to change the strip you are looking at is a detour through
           * a filing decision the merchant should never have to know about.
           */
          const activate = (slot: Slot) => () => {
            const source = slot.inheritedFrom;
            if (source && !wiringFor(source.page, source.key)) {
              onGoToPage(source.page, source.key);
              return;
            }
            onOpen(slot.key);
          };
          /**
           * A place edited elsewhere is read from THERE -- `inheritedFrom` says
           * which entry owns it -- so the notice drawn on every page is the one
           * the Header entry holds.
           */
          const wiringOf = (slot: Slot) => {
            const owner = ownerOf(page, slot);
            return wiringFor(owner.page, owner.key);
          };
          const valueOf = (slot: Slot) => {
            const wiring = wiringOf(slot);
            if (wiring) return slotValueFor(document, wiring);
            return slot.inheritedFrom
              ? allChoices[slot.inheritedFrom.page]?.[slot.inheritedFrom.key]
              : choices[slot.key];
          };
          /** A wired place's own section, so the drawing carries the merchant's own. */
          const liveOf = (slot: Slot) => {
            const wiring = wiringOf(slot);
            return (wiring ? sectionFor(document, wiring) : null) ?? undefined;
          };
          const settingsOf = (slot: Slot) =>
            slot.inheritedFrom ? (allChoices[slot.inheritedFrom.page] ?? {}) : choices;

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
                live={liveOf(slot)}
                pictureUrl={pictureUrl}
                departments={departments}
                categories={categories}
                promiseWords={promiseWords}
                blog={blog}
                shop={shop}
                brands={brands}
                reviews={reviews}
                policies={policies}
                footerSection={footerSection}
              />
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
                        live={liveOf(slot)}
                        pictureUrl={pictureUrl}
                        departments={departments}
                        categories={categories}
                        promiseWords={promiseWords}
                        blog={blog}
                        shop={shop}
                        brands={brands}
                        reviews={reviews}
                        policies={policies}
                        footerSection={footerSection}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
