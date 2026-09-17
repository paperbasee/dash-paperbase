"use client";

import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { localLabel } from "@/lib/theme-editor/document-ops";
import { cannotAdd } from "@/lib/theme-editor/rules";

const WIDE = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Wider screens slide it over the section list; phones get it from the bottom. */
function useWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
}

/** What the page allows, in the viewer's language; one already shown is listed but not offered. */
export function AddSectionSheet({
  open,
  manifest,
  allowed,
  sections,
  onPick,
  onClose,
}: {
  open: boolean;
  manifest: ThemeManifest;
  allowed: string[];
  sections: ThemeSection[];
  onPick: (type: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const wide = useWide();

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side={wide ? "left" : "bottom"}
        showCloseButton={false}
        className={
          wide
            ? "w-80 gap-0 p-0 sm:max-w-none xl:w-[360px]"
            : "max-h-[85dvh] gap-0 p-0 pb-[env(safe-area-inset-bottom)]"
        }
      >
        <SheetHeader className="flex-row items-start justify-between gap-2 border-b border-border">
          <div className="min-w-0 space-y-1">
            <SheetTitle>{t("addTitle")}</SheetTitle>
            <SheetDescription>{t("addHint")}</SheetDescription>
          </div>
          <Button type="button" variant="ghost" size="icon" className="-mr-2 -mt-2 size-11 md:size-9" aria-label={tCommon("close")} onClick={onClose}>
            <X aria-hidden />
          </Button>
        </SheetHeader>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {allowed.map((type) => {
            const spec = manifest.sections[type];
            if (!spec) return null;
            const refused = cannotAdd(manifest, allowed, sections, type);
            return (
              <li key={type}>
                <button
                  type="button"
                  disabled={refused !== null}
                  onClick={() => onPick(type)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-card border border-border px-3 py-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                >
                  <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{localLabel(spec, locale)}</span>
                    {refused === "onlyOnce" ? (
                      <span className="block text-xs text-muted-foreground">{t("alreadyOnPage")}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
