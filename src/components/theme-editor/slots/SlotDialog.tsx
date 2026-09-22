"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ThemeDocument, ThemeManifest } from "@/lib/theme-editor/api";
import { fieldValue, sectionFields } from "@/lib/theme-editor/field-specs";
import { linkPages } from "@/lib/theme-editor/link-targets";
import type { Slot } from "@/lib/theme-editor/slot-catalogue";
import { sectionFor, slotValueFor, type WiredSlot } from "@/lib/theme-editor/slot-sections";
import { EditorSheet } from "../EditorSheet";
import { LinkPicker } from "../LinkPicker";
import { SettingField } from "../SettingField";

/**
 * A wired place, edited in a pop-up (owner, 2026-09-22).
 *
 * Everywhere else on the canvas the choices open in place, under the thing that
 * was clicked. A place that is REAL is different: it is not two tiles to pick
 * between, it is a message, a link, the words to tap and two dates -- a form,
 * and a form pushing the page it belongs to down the screen means a merchant
 * types without seeing what they are typing into.
 *
 * On or off is here too rather than left behind on the canvas, so one dialog
 * holds one place and closing it is the only thing "Done" has to mean.
 *
 * The link picker is a sheet OVER this dialog: a link field asks for it rather
 * than being typed into, and it is the only other surface these fields need.
 */
export function SlotDialog({
  slot,
  wiring,
  manifest,
  document,
  onChoose,
  onSet,
  onClose,
}: {
  slot: Slot;
  wiring: WiredSlot;
  manifest: ThemeManifest;
  document: ThemeDocument;
  onChoose: (value: string) => void;
  onSet: (setting: string, value: unknown) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  const tEditor = useTranslations("themeEditor");
  const locale = useLocale();
  const [link, setLink] = useState<{ setting: string; value: string } | null>(null);

  const section = sectionFor(document, wiring);
  const showing = slotValueFor(document, wiring) === wiring.on;
  const specs = section ? sectionFields(manifest, section.type, locale) : [];
  const textOf = (setting: string) => {
    const held = section?.settings?.[setting];
    return typeof held === "string" ? held : "";
  };

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
              On or off first: everything under it is the words that go in it,
              and a merchant who wants the strip gone should not have to read
              five fields to find that out.
            */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border-subtle px-3 py-2.5">
              <span className="text-sm font-medium">{t("showThisPlace")}</span>
              <div role="group" className="inline-flex overflow-hidden rounded-xs border border-border-subtle">
                {[
                  { value: wiring.on, label: t("on") },
                  { value: wiring.off, label: t("off") },
                ].map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    aria-pressed={showing === (choice.value === wiring.on)}
                    onClick={() => onChoose(choice.value)}
                    className={
                      showing === (choice.value === wiring.on)
                        ? "bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                        : "px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    }
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            {showing
              ? specs.map((spec) => (
                  <SettingField
                    key={spec.id}
                    spec={spec}
                    value={fieldValue(spec, section?.settings)}
                    onChange={(value) => onSet(spec.id, value)}
                    onPickLink={() => setLink({ setting: spec.id, value: textOf(spec.id) })}
                    // No picture setting on a wired place yet; the picker arrives
                    // with the first place that has one rather than being mounted
                    // for nobody.
                    onPickPicture={() => {}}
                  />
                ))
              : null}
          </div>

          <DialogFooter>
            <Button type="button" className="h-11 w-full sm:h-9 sm:w-auto" onClick={onClose}>
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditorSheet
        open={link !== null}
        title={tEditor("linkTitle")}
        hint={tEditor("linkHint")}
        tall
        onClose={() => setLink(null)}
      >
        <LinkPicker
          open={link !== null}
          pages={linkPages(document)}
          value={link?.value ?? ""}
          onPick={(next) => {
            if (link) onSet(link.setting, next);
            setLink(null);
          }}
          onClose={() => setLink(null)}
        />
      </EditorSheet>
    </>
  );
}
