"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ChevronRight, Lock, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ThemeBlock, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { localLabel } from "@/lib/theme-editor/document-ops";
import { blockLimit, cannotAddBlock, cannotRemoveBlock } from "@/lib/theme-editor/rules";

/*
 * The parts inside one section: add, open, move and remove.
 *
 * Reads the same rules the API enforces, so what the screen offers and what a save would be
 * allowed to do are the same thing: a required part has no Remove button and says why, and
 * the Add button goes away once the section is full.
 */

const iconButton = "size-10 shrink-0 md:size-9 aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

export function BlockList({
  manifest,
  section,
  onOpen,
  onAdd,
  onRemove,
  onMove,
}: {
  manifest: ThemeManifest;
  section: ThemeSection;
  onOpen: (block: ThemeBlock) => void;
  onAdd: () => void;
  onRemove: (block: ThemeBlock) => void;
  onMove: (blockId: string, to: number) => void;
}) {
  const t = useTranslations("themeEditor");
  const locale = useLocale();
  const spec = manifest.sections[section.type];
  const blockTypes = Object.keys(spec?.blocks ?? {});
  if (blockTypes.length === 0) return null;

  const name = (block: ThemeBlock) => {
    const blockSpec = spec?.blocks?.[block.type];
    return blockSpec ? localLabel(blockSpec, locale) : block.type;
  };
  const addable = blockTypes.some((type) => !cannotAddBlock(manifest, section, type));
  const limit = blockLimit(manifest, section);
  const full = section.blocks.length >= limit;

  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-foreground">{t("blocksTitle")}</h3>
      {section.blocks.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-3 text-sm text-muted-foreground">
          {t("blocksEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {section.blocks.map((block, index) => {
            const required = cannotRemoveBlock(manifest, section, block) === "required";
            return (
              <li key={block.id} className="rounded-card border border-border bg-background">
                <div className="flex min-h-14 items-center gap-1 py-1.5 pl-1 pr-1.5">
                  <button
                    type="button"
                    onClick={() => onOpen(block)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-ui px-2 py-2 text-left hover:bg-accent md:min-h-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium text-foreground">{name(block)}</span>
                      {required ? (
                        <Badge variant="outline" className="mt-1">
                          <Lock aria-hidden />
                          {t("blockRequired")}
                        </Badge>
                      ) : null}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                  {required ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={iconButton}
                      aria-label={t("remove", { name: name(block) })}
                      title={t("remove", { name: name(block) })}
                      onClick={() => onRemove(block)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={iconButton}
                    aria-label={t("moveUp", { name: name(block) })}
                    title={t("moveUp", { name: name(block) })}
                    aria-disabled={index === 0}
                    onClick={index === 0 ? undefined : () => onMove(block.id, index - 1)}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={iconButton}
                    aria-label={t("moveDown", { name: name(block) })}
                    title={t("moveDown", { name: name(block) })}
                    aria-disabled={index === section.blocks.length - 1}
                    onClick={index === section.blocks.length - 1 ? undefined : () => onMove(block.id, index + 1)}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-muted-foreground">{t("blocksFull", { max: limit })}</p>
      ) : addable ? (
        <Button type="button" variant="outline" className="h-11 w-full md:h-10" onClick={onAdd}>
          <Plus aria-hidden />
          {t("addBlock")}
        </Button>
      ) : null}
    </section>
  );
}
