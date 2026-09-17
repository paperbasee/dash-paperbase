"use client";

import { useLocale, useTranslations } from "next-intl";
import { Loader2, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useThemeVersionsQuery } from "@/hooks/useThemesQuery";
import type { ThemeVersion } from "@/lib/theme-editor/api";
import { versionMoment, versionNumber } from "@/lib/theme-editor/versions";
import { EditorSheet } from "./EditorSheet";

/**
 * The saves this shop can go back to — at most the last twenty, newest first.
 *
 * A row is one plain line: which save, when, who, and whether shoppers are seeing it. Bringing one
 * back puts it in the draft rather than on the shop, so the merchant looks at it in the preview
 * and saves it themselves.
 */
export function VersionHistorySheet({
  open,
  busy,
  onRestore,
  onClose,
}: {
  open: boolean;
  busy: boolean;
  onRestore: (version: ThemeVersion) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const versions = useThemeVersionsQuery({ enabled: open });

  return (
    <EditorSheet open={open} title={t("historyTitle")} hint={t("historyHint")} tall onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {versions.isPending ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("historyLoading")}
          </p>
        ) : versions.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {t("historyFailed")}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => void versions.refetch()}>
              {tCommon("retry")}
            </Button>
          </div>
        ) : versions.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {versions.data.map((version) => (
              <li
                key={version.revision}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    <span>{t("historyVersion", { number: versionNumber(version.revision, locale) })}</span>
                    {version.is_live ? (
                      <Badge className="shrink-0">
                        {t("historyLive")}
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[versionMoment(version.published_at, locale), version.published_by_name]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {version.is_live ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-10 shrink-0 md:h-9"
                    disabled={busy}
                    onClick={() => onRestore(version)}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    {t("historyRestore")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </EditorSheet>
  );
}
