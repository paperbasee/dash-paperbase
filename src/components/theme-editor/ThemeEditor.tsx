"use client";

import { useReducer, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { usePreviewDevice } from "@/components/preview-system/usePreviewDevice";
import { useConfirm, type ConfirmDialogOptions } from "@/context/ConfirmDialogContext";
import type { ThemeEditorState, ThemeSection } from "@/lib/theme-editor/api";
import {
  isGroupPage,
  localLabel,
  pageSections,
  pageSpec,
  type PageKey,
} from "@/lib/theme-editor/document-ops";
import { editorReducer, initEditorState } from "@/lib/theme-editor/editor-reducer";
import { cn } from "@/lib/utils";
import { AddSectionSheet } from "./AddSectionSheet";
import { EditorTopBar, PagePicker } from "./EditorTopBar";
import { PreviewPane } from "./PreviewPane";
import { SectionList } from "./SectionList";
import { useEditorBackGuard } from "./useEditorBackGuard";

/** A 390px phone frame: most shoppers' phones are 360-412px wide. */
const PREVIEW_WIDTHS = { mobile: "390px" };

type Tab = "edit" | "preview";

/**
 * The full-screen theme editor: pick a page, then add, hide, move or remove what is on it.
 * Wider screens show the list and the preview side by side; phones switch between them
 * with the Edit and Preview tabs. Nothing is saved yet (editor steps 4 and 6).
 */
export function ThemeEditor({ loaded }: { loaded: ThemeEditorState }) {
  const t = useTranslations("themeEditor");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const confirm = useConfirm();
  const [state, dispatch] = useReducer(editorReducer, loaded, initEditorState);
  const { device, setDevice, width } = usePreviewDevice("desktop", PREVIEW_WIDTHS);
  const [tab, setTab] = useState<Tab>("edit");
  const [addOpen, setAddOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ id: string | null } | null>(null);
  const dialogOpen = useRef(false);

  const { manifest, page, changed } = state;
  const spec = pageSpec(manifest, page);
  const pageName = spec ? localLabel(spec, locale) : page;
  const allowed = spec?.sections ?? [];
  const sections = pageSections(state.document, page);
  const sectionName = (section: ThemeSection) => {
    const sectionSpec = manifest.sections[section.type];
    return sectionSpec ? localLabel(sectionSpec, locale) : section.type;
  };

  async function ask(options: ConfirmDialogOptions) {
    dialogOpen.current = true;
    try {
      return await confirm(options);
    } finally {
      dialogOpen.current = false;
    }
  }

  const confirmLeave = () =>
    ask({
      title: t("confirmLeaveTitle"),
      message: t("confirmLeaveMessage"),
      confirmText: t("confirmLeave"),
      cancelText: t("keepEditing"),
      variant: "warning",
    });

  const leave = useEditorBackGuard({
    changed,
    onBack: () => {
      // Back never stacks a second dialog, and closes an open panel before anything else.
      if (dialogOpen.current) return false;
      if (addOpen) {
        setAddOpen(false);
        return false;
      }
      if (!changed) return true;
      void confirmLeave().then((ok) => ok && leave());
      return false;
    },
  });

  async function handleClose() {
    if (changed && !(await confirmLeave())) return;
    leave();
  }

  async function handleRemove(section: ThemeSection) {
    const name = sectionName(section);
    const ok = await ask({
      title: t("confirmRemoveTitle", { name }),
      message: t("confirmRemoveMessage"),
      confirmText: t("confirmRemove"),
      cancelText: tCommon("cancel"),
      variant: "danger",
    });
    if (!ok) return;
    dispatch({ type: "remove", id: section.id });
    setFocusRequest({ id: null });
  }

  function handleAdd(type: string) {
    const next = editorReducer(state, { type: "add", sectionType: type });
    setAddOpen(false);
    if (next === state) return;
    dispatch({ type: "add", sectionType: type });
    const added = pageSections(next.document, page).at(-1);
    setFocusRequest({ id: added?.id ?? null });
  }

  const pickPage = (next: PageKey) => dispatch({ type: "pickPage", page: next });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorTopBar
        manifest={manifest}
        changed={changed}
        page={page}
        onPickPage={pickPage}
        device={device}
        onDevice={setDevice}
        onClose={() => void handleClose()}
      />

      <div className="shrink-0 space-y-2 border-b border-border px-4 py-2 md:hidden">
        <div role="tablist" aria-label={t("viewTabs")} className="grid grid-cols-2 gap-1 rounded-md bg-muted p-0.5">
          {(["edit", "preview"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`theme-editor-tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`theme-editor-${key}`}
              onClick={() => setTab(key)}
              className={cn(
                "h-10 rounded text-sm font-medium transition-colors",
                tab === key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "edit" ? t("tabEdit") : t("tabPreview")}
            </button>
          ))}
        </div>
        <PagePicker manifest={manifest} page={page} onPick={pickPage} />
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          id="theme-editor-edit"
          role="tabpanel"
          aria-labelledby="theme-editor-tab-edit"
          className={cn(
            "min-h-0 w-full overflow-y-auto md:block md:w-80 md:shrink-0 md:border-r md:border-border xl:w-[360px]",
            tab !== "edit" && "hidden",
          )}
        >
          <SectionList
            manifest={manifest}
            pageName={pageName}
            isGroup={isGroupPage(page)}
            allowed={allowed}
            sections={sections}
            focusRequest={focusRequest}
            onHide={(id) => dispatch({ type: "hide", id })}
            onShow={(id) => dispatch({ type: "show", id })}
            onMove={(id, to) => dispatch({ type: "move", id, to })}
            onRemove={(section) => void handleRemove(section)}
            onAdd={() => setAddOpen(true)}
          />
        </div>
        <div
          id="theme-editor-preview"
          role="tabpanel"
          aria-labelledby="theme-editor-tab-preview"
          className={cn("min-h-0 flex-1 md:flex", tab === "preview" ? "flex" : "hidden")}
        >
          <PreviewPane width={width} pageName={pageName} />
        </div>
      </div>

      <AddSectionSheet
        open={addOpen}
        manifest={manifest}
        allowed={allowed}
        sections={sections}
        onPick={handleAdd}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}
