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
 * Settings > Customization > Customize. **The editor.** There is no other one.
 *
 * Every page has the same places in the same order; a merchant adds a section,
 * removes one, and edits the ones that are there. Nothing is dragged, and
 * nothing is kept as a version to go back to (owner, 2026-09-22) -- the screen
 * that did those things, and the second address it lived at, are gone.
 *
 * It does not save yet, and says so across the top. What is left to do is the
 * wiring: every choice on this screen writing into the shop's theme document,
 * which is the document the storefront already reads.
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

  if (editor.data) return <SlotEditor loaded={editor.data} />;

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
