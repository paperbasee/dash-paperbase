"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/context/PermissionsContext";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { useSelectTheme, useThemesQuery } from "@/hooks/useThemesQuery";
import { THEME_EDITOR_HREF, themePageState } from "@/lib/theme-editor/access";
import { themeErrorMessageKey, type ThemeSummary } from "@/lib/theme-editor/api";
import { previewOrigin } from "@/lib/theme-editor/preview-origin";
import { BASIC_THEME_KEY, themeName } from "@/lib/theme-editor/theme-groups";
import { notify } from "@/notifications";
import { CustomizationShell } from "../_components/CustomizationShell";
import { CardVariantPicker } from "../_components/CardVariantPicker";
import { CurrentThemeCard } from "../_components/CurrentThemeCard";
import { ThemeLibrary } from "../_components/ThemeLibrary";
import { ThemeLockNotice } from "../_components/ThemeLockNotice";
import { useThemeEditor } from "../_hooks/useThemeEditor";
import { settingsSectionSurfaceClassName } from "../SettingsSectionBody";

const PREVIEW_ORIGIN = previewOrigin(process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN);

/** Basic's product card style, the one setting that predates themes. */
function BasicCardStyle({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations("settings");
  const tc = useTranslations("settings.customization");
  const { theme, loading, saving, error, selectCardVariant } = useThemeEditor();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {tc("loadingTheme")}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {error === "saveFailed" ? (
        <p className="text-sm text-destructive" role="alert">
          {tc("saveFailed")}
        </p>
      ) : null}
      <CardVariantPicker
        selectedVariant={theme?.card_variant ?? null}
        onSelect={selectCardVariant}
        disabled={saving || !canEdit}
      />
      {saving ? <p className="text-xs text-muted-foreground">{t("saving")}</p> : null}
    </div>
  );
}

export default function CustomizationSection({ hidden }: { hidden: boolean }) {
  const tc = useTranslations("settings.customization");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const navigate = useDeferredNavigate();
  const { isOwner } = usePermissions();
  // Loads only while the tab is open, like the Team section.
  const library = useThemesQuery({ enabled: !hidden });
  const select = useSelectTheme();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (hidden) return null;

  const data = library.data;
  const page = data ? themePageState(data.access) : null;
  // can_edit comes from the server, never from has(), which is true while loading.
  const canEdit = page?.canEdit === true;
  const canOpenEditor = canEdit && PREVIEW_ORIGIN !== null;

  function reportFailure(error: unknown) {
    const key = themeErrorMessageKey(error);
    // The library has been refetched by now, so the page already shows why.
    if (key === "errorGeneric" || key === "errorUnknownTheme") {
      notify.error(tc(key), { title: tc("heading") });
    } else {
      notify.warning(tc(key), { title: tc("heading") });
    }
  }

  async function handleTry(theme: ThemeSummary) {
    // A draft nobody can open would only replace the one the merchant has.
    if (!data || !canOpenEditor || busyKey) return;
    const name = themeName(theme, locale);
    // Nothing is asked and nothing is lost: every theme keeps its own design, so
    // opening one puts the work it already had back in front of the merchant.
    setBusyKey(theme.key);
    try {
      await select.mutateAsync({
        themeKey: theme.key,
        expectedDraftRevision: data.current.draft_revision,
      });
    } catch (error) {
      reportFailure(error);
      return;
    } finally {
      setBusyKey(null);
    }
    const started = data.current.started_themes.includes(theme.key);
    notify.success(tc(started ? "draftReopened" : "draftStarted", { theme: name }), {
      title: tc("heading"),
    });
    void navigate(THEME_EDITOR_HREF);
  }

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
        <CurrentThemeCard
          themes={themes}
          current={current}
          locked={page.lock !== null}
          canOpenEditor={canOpenEditor}
          previewMissing={canEdit && PREVIEW_ORIGIN === null}
        />
        <ThemeLibrary
          themes={themes}
          current={current}
          canOpenEditor={canOpenEditor}
          busyKey={busyKey}
          onTry={(theme) => void handleTry(theme)}
        />
        {current.live_theme === BASIC_THEME_KEY ? (
          <BasicCardStyle canEdit={data.access.can_edit} />
        ) : null}
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
