"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { SlotEditor } from "@/components/theme-editor/slots/SlotEditor";
import { useThemeEditorQuery } from "@/hooks/useThemesQuery";
import { useRouter } from "@/i18n/navigation";
import { CUSTOMIZATION_HREF } from "@/lib/theme-editor/access";
import { themeErrorMessageKey } from "@/lib/theme-editor/api";
import { pageFromSearch } from "@/lib/theme-editor/editor-url";
import { previewOrigin } from "@/lib/theme-editor/preview-origin";
import { notify } from "@/notifications";

/**
 * Settings > Customization > Customize. **The editor.** There is no other one.
 *
 * Every page has the same places in the same order; a merchant adds a section,
 * removes one, and edits the ones that are there. Nothing is dragged, and
 * nothing is kept as a version to go back to (owner, 2026-09-22) -- the screen
 * that did those things, and the second address it lived at, are gone.
 *
 * Every choice writes the shop's theme document as a private draft, and the
 * page in the middle is the shop itself drawing that draft (2026-09-26).
 *
 * **The permission check stays.** Who may open the editor is the API's answer,
 * not this page's, and it does not change because the screen behind it did: a
 * member without `theming.manage`, or a locked shop, gets a 403 and is sent
 * back to Customization with the reason.
 *
 * **It needs the preview host.** The page in the middle is the storefront drawing
 * the draft on its private host, so without that host's address there is nothing
 * to show; Customization does not offer the editor then, and this says why to
 * anyone who reaches the address anyway.
 */
const PREVIEW_ORIGIN = previewOrigin(process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN);

export default function ThemeEditorPage() {
  const tc = useTranslations("settings.customization");
  const tCommon = useTranslations("common");
  const t = useTranslations("themeEditor");
  const router = useRouter();
  const searchParams = useSearchParams();
  const editor = useThemeEditorQuery({ enabled: true });

  const status = (editor.error as { status?: unknown } | null)?.status;
  const refusal = status === 403 ? tc(themeErrorMessageKey(editor.error)) : null;

  useEffect(() => {
    if (!refusal) return;
    // One toast id, so React's development double effect shows it once.
    notify.warning(refusal, { id: "theme-editor-refused", title: tc("heading") });
    router.replace(CUSTOMIZATION_HREF);
  }, [refusal, router, tc]);

  if (PREVIEW_ORIGIN === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert" className="max-w-sm text-sm text-muted-foreground">
          {tc("previewNotSetUp")}
        </p>
      </div>
    );
  }

  // The page the address names -- `?page=checkout` -- so a refresh opens where the merchant was.
  if (editor.data) {
    return (
      <SlotEditor
        loaded={editor.data}
        origin={PREVIEW_ORIGIN}
        initialPage={pageFromSearch(searchParams.toString())}
      />
    );
  }

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
