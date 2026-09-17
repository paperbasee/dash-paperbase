"use client";

import { useLocale, useTranslations } from "next-intl";
import { Monitor, Smartphone, X } from "lucide-react";

import type { DeviceType } from "@/components/preview-system/usePreviewDevice";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ThemeManifest } from "@/lib/theme-editor/api";
import type { AutosaveStatus } from "@/lib/theme-editor/autosave";
import { editorPages, isGroupPage, localLabel, pageSpec, type PageKey } from "@/lib/theme-editor/document-ops";
import { themeName } from "@/lib/theme-editor/theme-groups";
import { cn } from "@/lib/utils";
import { EditorMenu } from "./EditorMenu";
import { SaveStatus } from "./SaveStatus";

/** A native select: the theme's pages, then the header and footer that sit on every page. */
export function PagePicker({
  manifest,
  page,
  onPick,
  size = "lg",
  className,
}: {
  manifest: ThemeManifest;
  page: PageKey;
  onPick: (page: PageKey) => void;
  size?: "default" | "lg";
  className?: string;
}) {
  const t = useTranslations("themeEditor");
  const locale = useLocale();
  const option = (key: PageKey) => {
    const spec = pageSpec(manifest, key);
    return (
      <option key={key} value={key}>
        {spec ? localLabel(spec, locale) : key}
      </option>
    );
  };
  const pages = editorPages(manifest);

  return (
    <Select
      aria-label={t("pageLabel")}
      value={page}
      onChange={(event) => onPick(event.target.value as PageKey)}
      className={className}
      size={size}
    >
      <optgroup label={t("pagesGroup")}>{pages.filter((p) => !isGroupPage(p)).map(option)}</optgroup>
      <optgroup label={t("everyPageGroup")}>{pages.filter(isGroupPage).map(option)}</optgroup>
    </Select>
  );
}

const DEVICES = [
  { key: "mobile", icon: Smartphone, labelKey: "phone" },
  { key: "desktop", icon: Monitor, labelKey: "desktop" },
] as const;

export function EditorTopBar({
  manifest,
  saveStatus,
  onRetrySave,
  page,
  onPickPage,
  device,
  onDevice,
  hasDraft,
  canSave,
  busy,
  onSave,
  onHistory,
  onDiscard,
  onClose,
}: {
  manifest: ThemeManifest;
  saveStatus: AutosaveStatus;
  onRetrySave: () => void;
  page: PageKey;
  onPickPage: (page: PageKey) => void;
  device: DeviceType;
  onDevice: (device: DeviceType) => void;
  /** The server holds a draft, so there is something to discard. */
  hasDraft: boolean;
  /** There is a draft or an edit of this session to put on the shop. */
  canSave: boolean;
  /** A whole-theme action is running: one at a time. */
  busy: boolean;
  onSave: () => void;
  onHistory: () => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor");
  const locale = useLocale();

  return (
    <header className="shrink-0 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2 px-2 md:gap-3 md:px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 md:size-9"
          aria-label={t("close")}
          title={t("close")}
          disabled={busy}
          onClick={onClose}
        >
          <X aria-hidden />
        </Button>
        <div className="min-w-0 flex-1 md:w-56 md:flex-none">
          <p className="truncate text-sm font-semibold text-foreground">
            {themeName(manifest, locale)}
          </p>
          <SaveStatus status={saveStatus} onRetry={onRetrySave} />
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <PagePicker manifest={manifest} page={page} onPick={onPickPage} size="default" className="max-w-72" />
        </div>

        <div role="group" aria-label={t("previewSize")} className="hidden items-center gap-1 rounded-card bg-muted/60 p-1 md:flex">
          {DEVICES.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => onDevice(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-ui px-2.5 py-1.5 text-xs font-medium transition-colors",
                device === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="hidden lg:inline">{t(labelKey)}</span>
              <span className="sr-only lg:hidden">{t(labelKey)}</span>
            </button>
          ))}
        </div>

        <EditorMenu hasDraft={hasDraft} busy={busy} onHistory={onHistory} onDiscard={onDiscard} />

        <Button
          type="button"
          className="h-11 shrink-0 md:h-9"
          disabled={!canSave || busy}
          onClick={onSave}
        >
          {t("saveToShop")}
        </Button>
      </div>
    </header>
  );
}
