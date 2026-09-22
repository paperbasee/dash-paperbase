"use client";

import { useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ThemeBlock, ThemeDocument, ThemeImage, ThemeManifest } from "@/lib/theme-editor/api";
import { blockFields, fieldValue, sectionFields } from "@/lib/theme-editor/field-specs";
import { linkPages } from "@/lib/theme-editor/link-targets";
import type { FieldSpec } from "@/lib/theme-editor/field-specs";
import type { Slot } from "@/lib/theme-editor/slot-catalogue";
import { sectionFor, slotValueFor, type WiredSlot } from "@/lib/theme-editor/slot-sections";
import { cn } from "@/lib/utils";
import { EditorSheet } from "../EditorSheet";
import { LinkPicker } from "../LinkPicker";
import { PicturePicker } from "../PicturePicker";
import { SettingField } from "../SettingField";

/** What the merchant is being asked for, over the dialog: a link, or a picture. */
type Asked =
  | { kind: "link"; setting: string; value: string; blockId?: string }
  | { kind: "picture"; setting: string; value: string; blockId?: string };

/**
 * A wired place, edited in a pop-up (owner, 2026-09-22).
 *
 * Everywhere else on the canvas the choices open in place, under the thing that
 * was clicked. A place that is REAL is different: it is not two tiles to pick
 * between, it is a form -- and a form pushing the page it belongs to down the
 * screen means a merchant types without seeing what they are typing into.
 *
 * Three parts, in the order a merchant thinks about them: what this place is,
 * then the settings of that, then the things inside it -- the hero's pictures,
 * a FAQ's questions. Add, remove and move are buttons; nothing drags.
 */
export function SlotDialog({
  slot,
  wiring,
  manifest,
  document,
  premiumSections,
  pictures,
  pictureUrl,
  onChoose,
  onSet,
  onSetBlock,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onClose,
}: {
  slot: Slot;
  wiring: WiredSlot;
  manifest: ThemeManifest;
  document: ThemeDocument;
  /** Whether this shop's plan includes the theme's paid sections. */
  premiumSections: boolean;
  /** Pictures this shop has already placed, for the picker to offer. */
  pictures: ThemeImage[];
  /** A picture key this shop uploaded, to the URL it draws from. */
  pictureUrl: (key: string) => string;
  onChoose: (value: string) => void;
  onSet: (setting: string, value: unknown) => void;
  onSetBlock: (blockId: string, setting: string, value: unknown) => void;
  onAddBlock: (blockType: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, to: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  const tEditor = useTranslations("themeEditor");
  const locale = useLocale();
  const [asked, setAsked] = useState<Asked | null>(null);

  const section = sectionFor(document, wiring);
  const chosen = slotValueFor(document, wiring);
  const spec = section ? manifest.sections[section.type] : undefined;
  const specs = section ? sectionFields(manifest, section.type, locale) : [];
  // One kind of part per wired section so far -- a picture, a question. A
  // section with two would need the merchant asked which, and none has two.
  const blockType = Object.keys(spec?.blocks ?? {})[0];
  const blocks = section?.blocks ?? [];
  const most = spec?.max_blocks;
  const full = typeof most === "number" && blocks.length >= most;

  const held = (settings: Record<string, unknown> | undefined, setting: string) => {
    const value = settings?.[setting];
    return typeof value === "string" ? value : "";
  };

  const ask = (kind: Asked["kind"], spec_: FieldSpec, blockId?: string) =>
    setAsked({
      kind,
      setting: spec_.id,
      value: held(blockId ? blocks.find((b) => b.id === blockId)?.settings : section?.settings, spec_.id),
      blockId,
    });

  const answer = (value: string) => {
    if (!asked) return;
    if (asked.blockId) onSetBlock(asked.blockId, asked.setting, value);
    else onSet(asked.setting, value);
    setAsked(null);
  };

  const fieldsFor = (block: ThemeBlock) =>
    section ? blockFields(manifest, section.type, block.type, locale) : [];

  return (
    <>
      <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
        <DialogContent className="w-[min(100%,calc(100vw-2.5rem))] max-w-lg">
          <DialogHeader>
            <DialogTitle>{t(slot.label)}</DialogTitle>
            <DialogDescription>{t(slot.hint ?? "wiredHint")}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[65dvh] space-y-4 overflow-y-auto px-6 py-4">
            {/*
              What this place IS, first: everything under it belongs to the
              answer, and a merchant who wants it gone should not have to read
              five fields to find that out.
            */}
            {/*
              One row, split evenly: two choices take half each, three take a
              third. A tab bar whose tabs are as wide as their own words reads
              as a list of links rather than as a choice between two things --
              and the wider target is the easier one to hit on a phone.

              The column count is a CSS variable because Tailwind builds the
              classes it can SEE, and a class assembled from a number at render
              time is invisible to it. Same trick the canvas uses for a row of
              places.
            */}
            <div
              role="group"
              aria-label={t("whatGoesHere")}
              className="grid gap-2 rounded-sm border border-border-subtle p-2 [grid-template-columns:var(--option-cols)]"
              style={
                {
                  "--option-cols": `repeat(${(slot.options ?? []).length || 1}, minmax(0,1fr))`,
                } as CSSProperties
              }
            >
              {(slot.options ?? []).map((option) => {
                const locked = Boolean(option.premium) && !premiumSections;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={chosen === option.value}
                    disabled={locked}
                    title={locked ? t("premiumSection") : undefined}
                    onClick={() => onChoose(option.value)}
                    className={cn(
                      "min-h-9 rounded-xs px-3 py-1.5 text-center text-xs font-medium",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      chosen === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(option.label)}
                    {option.premium ? ` · ${t("premium")}` : null}
                  </button>
                );
              })}
            </div>

            {specs.map((fieldSpec) => (
              <SettingField
                key={fieldSpec.id}
                spec={fieldSpec}
                value={fieldValue(fieldSpec, section?.settings)}
                onChange={(value) => onSet(fieldSpec.id, value)}
                onPickLink={() => ask("link", fieldSpec)}
                onPickPicture={() => ask("picture", fieldSpec)}
                pictureUrl={pictureUrl}
              />
            ))}

            {/* The things inside this place: the hero's pictures, in order. */}
            {section && blockType ? (
              <div className="space-y-3 border-t border-border-subtle pt-4">
                {blocks.map((block, index) => (
                  <div key={block.id} className="space-y-3 rounded-sm border border-border-subtle p-3">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        {t("partNumber", { number: index + 1 })}
                      </strong>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          aria-label={tEditor("moveUp", { name: t(slot.label) })}
                          aria-disabled={index === 0}
                          onClick={index === 0 ? undefined : () => onMoveBlock(block.id, index - 1)}
                        >
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          aria-label={tEditor("moveDown", { name: t(slot.label) })}
                          aria-disabled={index === blocks.length - 1}
                          onClick={
                            index === blocks.length - 1
                              ? undefined
                              : () => onMoveBlock(block.id, index + 1)
                          }
                        >
                          <ArrowDown aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          aria-label={t("removePart", { number: index + 1 })}
                          onClick={() => onRemoveBlock(block.id)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </div>

                    {fieldsFor(block).map((fieldSpec) => (
                      <SettingField
                        key={fieldSpec.id}
                        spec={fieldSpec}
                        value={fieldValue(fieldSpec, block.settings)}
                        onChange={(value) => onSetBlock(block.id, fieldSpec.id, value)}
                        onPickLink={() => ask("link", fieldSpec, block.id)}
                        onPickPicture={() => ask("picture", fieldSpec, block.id)}
                        pictureUrl={pictureUrl}
                      />
                    ))}
                  </div>
                ))}

                {/*
                  The cap is the theme's and the API enforces it; this says so
                  rather than refusing a click with no explanation.
                */}
                {full ? (
                  <p className="text-xs text-muted-foreground">{t("partsFull", { max: most })}</p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full md:h-9"
                    onClick={() => onAddBlock(blockType)}
                  >
                    <Plus aria-hidden />
                    {t("addPart")}
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" className="h-11 w-full sm:h-9 sm:w-auto" onClick={onClose}>
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditorSheet
        open={asked?.kind === "link"}
        title={tEditor("linkTitle")}
        hint={tEditor("linkHint")}
        tall
        onClose={() => setAsked(null)}
      >
        <LinkPicker
          open={asked?.kind === "link"}
          pages={linkPages(document)}
          value={asked?.value ?? ""}
          onPick={answer}
          onClose={() => setAsked(null)}
        />
      </EditorSheet>

      <EditorSheet
        open={asked?.kind === "picture"}
        title={tEditor("pictureTitle")}
        hint={tEditor("pictureHint")}
        tall
        onClose={() => setAsked(null)}
      >
        <PicturePicker
          open={asked?.kind === "picture"}
          used={pictures}
          current={asked?.value ?? ""}
          onPick={(picture) => answer(picture.key)}
          onClose={() => setAsked(null)}
        />
      </EditorSheet>
    </>
  );
}
