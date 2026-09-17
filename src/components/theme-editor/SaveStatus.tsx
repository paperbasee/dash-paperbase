"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { themeErrorMessageKey, type ThemeManifest } from "@/lib/theme-editor/api";
import type { AutosaveStatus } from "@/lib/theme-editor/autosave";
import { localLabel, pageAtPath, pageSpec } from "@/lib/theme-editor/document-ops";

/** The short save state under the theme name: Saving…, Saved as draft, or Couldn't save with Try again. */
export function SaveStatus({ status, onRetry }: { status: AutosaveStatus; onRetry: () => void }) {
  const t = useTranslations("themeEditor");
  const tCommon = useTranslations("common");

  if (status.kind === "idle") return null;
  if (status.kind === "saving" || status.kind === "saved") {
    return (
      <p role="status" className="truncate text-xs text-muted-foreground">
        {status.kind === "saving" ? tCommon("saving") : t("savedDraft")}
      </p>
    );
  }
  return (
    <p role="status" className="flex min-w-0 items-center gap-1.5 text-xs text-destructive">
      <span className="truncate">{t("notSaved")}</span>
      {status.kind === "failed" ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-ui px-1 py-0.5 font-medium underline underline-offset-2 hover:text-foreground"
        >
          {tCommon("retry")}
        </button>
      ) : null}
    </p>
  );
}

/** Why autosave has stopped, in full, under the top bar: a document the API refused, a conflict, or lost access. */
export function SaveProblem({
  status,
  manifest,
  onReload,
}: {
  status: AutosaveStatus;
  manifest: ThemeManifest;
  onReload: () => void;
}) {
  const t = useTranslations("themeEditor");
  const tc = useTranslations("settings.customization");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  let message: string;
  if (status.kind === "conflict") {
    message = t("saveConflict");
  } else if (status.kind === "refused") {
    message = tc(themeErrorMessageKey(status.error));
  } else if (status.kind === "invalid") {
    const at = pageAtPath(status.document, status.path);
    const page = at ? pageSpec(manifest, at.page) : null;
    const section = at?.section ? manifest.sections[at.section.type] : undefined;
    message =
      page && section
        ? t("saveInvalidSection", { section: localLabel(section, locale), page: localLabel(page, locale) })
        : page
          ? t("saveInvalidPage", { page: localLabel(page, locale) })
          : t("saveInvalid");
  } else {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
    >
      <p className="min-w-0 flex-1">{message}</p>
      {status.kind === "conflict" ? (
        <Button type="button" size="sm" variant="outline" onClick={onReload}>
          {tCommon("reload")}
        </Button>
      ) : null}
    </div>
  );
}
