"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ExternalLink } from "lucide-react";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { Button } from "@/components/ui/button";
import type { ThemeBlock, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { sectionContentPlace } from "@/lib/theme-editor/content-links";
import { localLabel } from "@/lib/theme-editor/document-ops";
import { blockFields, fieldValue, sectionFields, type FieldSpec } from "@/lib/theme-editor/field-specs";
import { BlockList } from "./BlockList";
import { SettingField } from "./SettingField";

/*
 * The settings of one section, or of one of its parts.
 *
 * The fields come from the theme file, never from a list kept here, so a new theme brings its
 * own form. A section that has none says so rather than showing an empty panel — and when its
 * words and pictures are merchant content kept elsewhere (the banners, the header's notice),
 * it says where they are and links there instead of pretending the text lives in the theme.
 */

export function SettingsPanel({
  manifest,
  section,
  block,
  onBack,
  onSet,
  onPickLink,
  onOpenBlock,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
}: {
  manifest: ThemeManifest;
  section: ThemeSection;
  /** Set when one of the section's parts is open; its own fields are shown instead. */
  block: ThemeBlock | null;
  onBack: () => void;
  onSet: (setting: string, value: unknown) => void;
  onPickLink: (spec: FieldSpec) => void;
  onOpenBlock: (block: ThemeBlock) => void;
  onAddBlock: () => void;
  onRemoveBlock: (block: ThemeBlock) => void;
  onMoveBlock: (blockId: string, to: number) => void;
}) {
  const t = useTranslations("themeEditor");
  const locale = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const sectionSpec = manifest.sections[section.type];
  const blockSpec = block ? sectionSpec?.blocks?.[block.type] : undefined;
  const name = block
    ? blockSpec
      ? localLabel(blockSpec, locale)
      : block.type
    : sectionSpec
      ? localLabel(sectionSpec, locale)
      : section.type;
  const fields = block
    ? blockFields(manifest, section.type, block.type, locale)
    : sectionFields(manifest, section.type, locale);
  const settings = block ? block.settings : section.settings;
  const place = block ? null : sectionContentPlace(section.type);

  // Opening a part, and coming back out of one, moves reading to the new heading.
  useEffect(() => {
    headingRef.current?.focus();
  }, [section.id, block?.id]);

  return (
    <div className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="space-y-2">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 h-9" onClick={onBack}>
          <ChevronLeft aria-hidden />
          {block ? t("backToSection") : t("backToList")}
        </Button>
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-foreground outline-none">
          {name}
        </h2>
      </div>

      {place ? (
        <div className="space-y-2 rounded-card border border-border bg-muted/40 p-3">
          <p className="text-sm text-muted-foreground">{t(place.key)}</p>
          <Button asChild variant="outline" size="sm" className="h-9">
            <DeferredNavLink href={place.href}>
              {t("contentOpen")}
              <ExternalLink aria-hidden />
            </DeferredNavLink>
          </Button>
        </div>
      ) : null}

      {fields.length === 0 && !place ? (
        <p className="rounded-card border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t("noSettings")}
        </p>
      ) : null}

      {fields.length > 0 ? (
        <div className="space-y-5">
          {fields.map((spec) => (
            <SettingField
              key={`${block?.id ?? section.id}:${spec.id}`}
              spec={spec}
              value={fieldValue(spec, settings)}
              onChange={(value) => onSet(spec.id, value)}
              onPickLink={() => onPickLink(spec)}
            />
          ))}
        </div>
      ) : null}

      {block ? null : (
        <BlockList
          manifest={manifest}
          section={section}
          onOpen={onOpenBlock}
          onAdd={onAddBlock}
          onRemove={onRemoveBlock}
          onMove={onMoveBlock}
        />
      )}
    </div>
  );
}
