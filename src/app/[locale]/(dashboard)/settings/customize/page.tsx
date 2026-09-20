"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { SlotEditor } from "@/components/theme-editor/slots/SlotEditor";
import { useThemeEditorQuery } from "@/hooks/useThemesQuery";
import { useRouter } from "@/i18n/navigation";
import { CUSTOMIZATION_HREF } from "@/lib/theme-editor/access";
import { themeErrorMessageKey } from "@/lib/theme-editor/api";
import { notify } from "@/notifications";

/**
 * Settings > Customization > Customize.
 *
 * **The slot editor, which is the design and not yet the wiring.** The owner
 * decided on 2026-09-20 that a merchant arranges nothing: every page has the
 * same places in the same order, and the only choice is what fills each one.
 * This screen is that idea, built to be used and argued with; it saves nothing
 * yet and says so across the top. The editor that does save is at `./sections`
 * until this one is wired, and then it goes.
 *
 * **The permission check stays.** Who may open the editor is the API's answer,
 * not this page's, and it does not change because the screen behind it did: a
 * member without `theming.manage`, or a locked shop, gets a 403 and is sent
 * back to Customization with the reason.
 *
 * What it no longer waits for is the preview host. The old editor could not open
 * without one because it had nothing to show; this one draws its own shop, so a
 * missing preview origin is no longer a reason to refuse a merchant the screen.
 */
export default function ThemeEditorPage() {
  const tc = useTranslations("settings.customization");
  const tCommon = useTranslations("common");
  const t = useTranslations("themeEditor");
  const router = useRouter();
  const editor = useThemeEditorQuery({ enabled: true });

  const status = (editor.error as { status?: unknown } | null)?.status;
  const refusal = status === 403 ? tc(themeErrorMessageKey(editor.error)) : null;

  useEffect(() => {
    if (!refusal) return;
    // One toast id, so React's development double effect shows it once.
    notify.warning(refusal, { id: "theme-editor-refused", title: tc("heading") });
    router.replace(CUSTOMIZATION_HREF);
  }, [refusal, router, tc]);

  if (editor.data) return <SlotEditor />;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      {editor.isError && !refusal ? (
        <p role="alert" className="max-w-sm text-sm text-destructive">
          {t("loadFailed")}
          <button
            type="button"
            onClick={() => void editor.refetch()}
            className="ml-2 font-medium underline underline-offset-2"
          >
            {tCommon("retry")}
          </button>
        </p>
      ) : (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("opening")}
        </p>
      )}
    </div>
  );
}
