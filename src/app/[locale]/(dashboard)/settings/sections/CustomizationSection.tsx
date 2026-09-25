"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/context/PermissionsContext";
import { useThemesQuery } from "@/hooks/useThemesQuery";
import { themePageState } from "@/lib/theme-editor/access";
import { previewOrigin } from "@/lib/theme-editor/preview-origin";
import { CustomizationShell } from "../_components/CustomizationShell";
import { CurrentThemeCard } from "../_components/CurrentThemeCard";
import { ThemeLockNotice } from "../_components/ThemeLockNotice";
import { settingsSectionSurfaceClassName } from "../SettingsSectionBody";

const PREVIEW_ORIGIN = previewOrigin(process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN);


export default function CustomizationSection({ hidden }: { hidden: boolean }) {
  const tc = useTranslations("settings.customization");
  const tCommon = useTranslations("common");
  const { isOwner } = usePermissions();
  // Loads only while the tab is open, like the Team section.
  const library = useThemesQuery({ enabled: !hidden });

  if (hidden) return null;

  const data = library.data;
  const page = data ? themePageState(data.access) : null;
  // can_edit comes from the server, never from has(), which is true while loading.
  const canEdit = page?.canEdit === true;
  const canOpenEditor = canEdit && PREVIEW_ORIGIN !== null;

  let body: ReactNode;
  if (library.isLoading) {
    body = (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {tc("loadingThemes")}
      </div>
    );
  } else if (!data || !page) {
    body = (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-destructive">{tc("themesError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void library.refetch()}>
          {tCommon("retry")}
        </Button>
      </div>
    );
  } else {
    const { current, themes } = data;
    body = (
      <div className="space-y-6">
        {page.lock ? (
          <ThemeLockNotice
            lock={page.lock}
            isOwner={isOwner}
            hasSavedWork={current.published_at !== null || current.has_draft}
          />
        ) : null}
        {page.readOnly ? (
          <p role="status" className="rounded-card border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            {tc("readOnlyNotice")}
          </p>
        ) : null}
        {/*
          The shop's theme and the way into the editor. The gallery of themes
          that stood under it went on 2026-09-25: there is one theme (owner:
          "there is only one thing, so no need to keep the themes").
        */}
        <CurrentThemeCard
          themes={themes}
          current={current}
          locked={page.lock !== null}
          canOpenEditor={canOpenEditor}
          previewMissing={canEdit && PREVIEW_ORIGIN === null}
        />
      </div>
    );
  }

  return (
    <section
      id="panel-customization"
      role="tabpanel"
      aria-labelledby="tab-customization"
      className={settingsSectionSurfaceClassName}
    >
      <CustomizationShell title={tc("heading")} description={tc("subtitle")}>
        {body}
      </CustomizationShell>
    </section>
  );
}
