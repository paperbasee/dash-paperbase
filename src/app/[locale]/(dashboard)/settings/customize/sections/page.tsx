"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { ThemeEditor } from "@/components/theme-editor/ThemeEditor";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { Button } from "@/components/ui/button";
import { useThemeEditorQuery } from "@/hooks/useThemesQuery";
import { useRouter } from "@/i18n/navigation";
import { CUSTOMIZATION_HREF } from "@/lib/theme-editor/access";
import { themeErrorMessageKey } from "@/lib/theme-editor/api";
import { previewOrigin } from "@/lib/theme-editor/preview-origin";
import { notify } from "@/notifications";

const PREVIEW_ORIGIN = previewOrigin(process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN);

/**
 * Settings > Customization > Customize > Sections. **The editor that saves.**
 *
 * It was at `../` until 2026-09-20, when the slot design took that address. It
 * stays reachable because it is the only screen that actually writes a draft,
 * and taking that away before the replacement is wired would leave a merchant
 * with nothing that works. It goes the day the slot editor saves.
 *
 * The API decides who may edit: a member without theming.manage, or a locked
 * shop, gets a 403 and is sent back to Customization with the reason (the page
 * there shows the lock too). Without a preview host this editor has nothing to
 * show, so it does not open at all.
 */
export default function ThemeEditorPage() {
  const t = useTranslations("themeEditor");
  const tc = useTranslations("settings.customization");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const editor = useThemeEditorQuery({ enabled: PREVIEW_ORIGIN !== null });

  const status = (editor.error as { status?: unknown } | null)?.status;
  const refusal =
    PREVIEW_ORIGIN === null ? t("unavailable") : status === 403 ? tc(themeErrorMessageKey(editor.error)) : null;

  useEffect(() => {
    if (!refusal) return;
    // One toast id, so React's development double effect shows it once.
    notify.warning(refusal, { id: "theme-editor-refused", title: tc("heading") });
    router.replace(CUSTOMIZATION_HREF);
  }, [refusal, router, tc]);

  if (editor.data && PREVIEW_ORIGIN) return <ThemeEditor loaded={editor.data} origin={PREVIEW_ORIGIN} />;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      {editor.isError && !refusal ? (
        <>
          <p role="alert" className="max-w-sm text-sm text-destructive">
            {t("loadFailed")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => void editor.refetch()}>
              {tCommon("retry")}
            </Button>
            <Button asChild variant="outline">
              <DeferredNavLink href={CUSTOMIZATION_HREF}>{t("backToCustomization")}</DeferredNavLink>
            </Button>
          </div>
        </>
      ) : (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("opening")}
        </p>
      )}
    </div>
  );
}
