"use client";

import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { usePreviewDevice } from "@/components/preview-system/usePreviewDevice";
import { Button } from "@/components/ui/button";
import { useConfirm, type ConfirmDialogOptions } from "@/context/ConfirmDialogContext";
import { usePreviewExamplesQuery } from "@/hooks/useThemesQuery";
import { getMeProfileKeyFromToken } from "@/lib/me-profile-store";
import type { ThemeEditorState, ThemeSection } from "@/lib/theme-editor/api";
import {
  editorPages,
  isGroupPage,
  localLabel,
  pageSections,
  pageSpec,
  type PageKey,
} from "@/lib/theme-editor/document-ops";
import { editorReducer, initEditorState } from "@/lib/theme-editor/editor-reducer";
import { pathLocale, previewTarget, templateForPath } from "@/lib/theme-editor/preview-paths";
import type { PreviewMessage, PreviewState } from "@/lib/theme-editor/preview-session";
import {
  clearUnsentCopy,
  mayReplaceUnsentCopy,
  readUnsentCopy,
  unsentCopyChoice,
  unsentCopyKey,
  writeUnsentCopy,
  type UnsentCopy,
} from "@/lib/theme-editor/unsent-copy";
import { cn } from "@/lib/utils";
import { AddSectionSheet } from "./AddSectionSheet";
import { EditorTopBar, PagePicker } from "./EditorTopBar";
import { PreviewPane } from "./PreviewPane";
import { SaveProblem } from "./SaveStatus";
import { SectionList } from "./SectionList";
import { useAutosave } from "./useAutosave";
import { useEditorBackGuard } from "./useEditorBackGuard";
import { usePreviewSession } from "./usePreviewSession";

/** A 390px phone frame: most shoppers' phones are 360-412px wide. */
const PREVIEW_WIDTHS = { mobile: "390px" };

const MISSING_NOTE = {
  category: "previewNoCategory",
  product: "previewNoProduct",
  post: "previewNoPost",
} as const;

type Tab = "edit" | "preview";

/** The signed-in member and the store being edited, from the dashboard's access token. */
function editorIdentity(): { user: string; store: string } | null {
  if (typeof window === "undefined") return null;
  const key = getMeProfileKeyFromToken(window.localStorage.getItem("access_token") ?? "");
  const [user, store] = key?.split("\u001e") ?? [];
  return user && store ? { user, store } : null;
}

/** Unsent edits this device kept from an earlier visit, and what to do with them. */
function findUnsentCopy(loaded: ThemeEditorState) {
  const identity = editorIdentity();
  const key = identity ? unsentCopyKey(identity.user, identity.store) : null;
  const copy = key ? readUnsentCopy(window.localStorage, key) : null;
  const choice = unsentCopyChoice(copy, { document: loaded.document, draftRevision: loaded.draft_revision });
  // The copies this tab may replace: its own (a new id each time the editor opens) and the one found now.
  const tabs = [Math.random().toString(36).slice(2), copy?.tab] as const;
  return { identity, key, tabs, copy: choice === "none" ? null : copy, choice };
}

/**
 * The full-screen theme editor: pick a page, then add, hide, move or remove what is on it.
 * Wider screens show the list and the preview side by side; phones switch between them
 * with the Edit and Preview tabs. Every edit saves itself as the private draft and redraws
 * the preview; publishing comes with editor step 6.
 */
export function ThemeEditor({ loaded, origin }: { loaded: ThemeEditorState; origin: string }) {
  const t = useTranslations("themeEditor");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const confirm = useConfirm();
  const [found] = useState(() => findUnsentCopy(loaded));
  const [state, dispatch] = useReducer(editorReducer, loaded, (value) => {
    const initial = initEditorState(value);
    return found.choice === "restore" && found.copy
      ? editorReducer(initial, { type: "restore", document: found.copy.document })
      : initial;
  });
  // "ask" keeps the copy untouched until the merchant chooses.
  const [copyNotice, setCopyNotice] = useState<"restored" | "ask" | null>(
    found.choice === "none" ? null : found.choice === "restore" ? "restored" : "ask",
  );
  const { device, setDevice, width } = usePreviewDevice("desktop", PREVIEW_WIDTHS);
  const [tab, setTab] = useState<Tab>("edit");
  const [addOpen, setAddOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ id: string | null } | null>(null);
  const [reloading, setReloading] = useState(false);
  const dialogOpen = useRef(false);
  const closing = useRef(false);

  const { manifest, page } = state;
  const spec = pageSpec(manifest, page);
  const pageName = spec ? localLabel(spec, locale) : page;
  const allowed = spec?.sections ?? [];
  const sections = pageSections(state.document, page);
  const sectionName = (section: ThemeSection) => {
    const sectionSpec = manifest.sections[section.type];
    return sectionSpec ? localLabel(sectionSpec, locale) : section.type;
  };

  // The page picker follows the frame when the merchant moves around inside it. Not for the
  // ready that answers entering, which lands on home whatever page is picked (the frame is taken
  // to the picked page instead), nor while it is being taken there.
  function followFrame(message: PreviewMessage, before: PreviewState) {
    if (message.type !== "ready" && message.type !== "navigated") return;
    if (message.type === "ready" && before.phase === "entering") return;
    const { phase } = preview.current();
    if (phase === "otherStore" || phase === "loading" || isGroupPage(page)) return;
    const template = templateForPath(message.path);
    if (template && editorPages(manifest).includes(template)) dispatch({ type: "pickPage", page: template });
  }

  const preview = usePreviewSession({
    origin,
    storePublicId: found.identity?.store ?? "",
    savedVersion: loaded.preview_version,
    onMessage: followFrame,
  });
  const save = useAutosave({ loaded, document: state.document, onSaved: preview.saved });
  const examples = usePreviewExamplesQuery();

  // Where the preview should go to show the picked page, from where it is now.
  const { current: currentPreview, show } = preview;
  const frameShown = preview.state.hasShown;
  const targetFor = (key: PageKey, path: string) =>
    examples.data ? previewTarget(key, examples.data, pathLocale(path) ?? locale) : null;

  // The frame follows the page picker, and catches up once it has first shown and once the
  // examples arrive (a page picked while the preview was still opening).
  useEffect(() => {
    const path = currentPreview().path;
    if (!frameShown || !path || isGroupPage(page) || templateForPath(path) === page || !examples.data) return;
    const target = previewTarget(page, examples.data, pathLocale(path) ?? locale);
    if (target && "path" in target) show(target.path);
  }, [page, examples.data, frameShown, currentPreview, show, locale]);

  // Keep unsent edits on this device until the server has them. Never over another open tab's copy.
  const { unsent, draftRevision } = save;
  useEffect(() => {
    // While the merchant is asked about an older copy, it is kept until they edit.
    if (!found.key || (copyNotice === "ask" && !unsent)) return;
    if (!mayReplaceUnsentCopy(readUnsentCopy(window.localStorage, found.key), found.tabs)) return;
    if (unsent) {
      writeUnsentCopy(window.localStorage, found.key, {
        document: state.document,
        baseDraftRevision: draftRevision,
        savedAt: Date.now(),
        tab: found.tabs[0],
      });
    } else {
      clearUnsentCopy(window.localStorage, found.key);
    }
  }, [found.key, found.tabs, copyNotice, unsent, draftRevision, state.document]);

  useEffect(() => {
    if (reloading) window.location.reload();
  }, [reloading]);

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
    changed: unsent && !reloading,
    onBack: () => {
      // Back never stacks a second dialog, and closes an open panel before anything else.
      if (dialogOpen.current) return false;
      if (addOpen) {
        setAddOpen(false);
        return false;
      }
      if (!unsent) return true;
      void handleClose();
      return false;
    },
  });

  /** Send what is waiting first; ask only when it could not be saved. */
  async function handleClose() {
    if (closing.current) return;
    closing.current = true;
    try {
      await save.flush();
      if (save.latest().unsent && !(await confirmLeave())) return;
      leave();
    } finally {
      closing.current = false;
    }
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

  function answerCopy(restore: boolean, copy: UnsentCopy | null) {
    if (restore && copy) dispatch({ type: "restore", document: copy.document });
    else if (found.key && mayReplaceUnsentCopy(readUnsentCopy(window.localStorage, found.key), found.tabs)) {
      clearUnsentCopy(window.localStorage, found.key);
    }
    setCopyNotice(null);
  }

  /**
   * Reload after a conflict. The page and everything unsent in it go, so this tab's edits are
   * put in the device copy first, whichever tab wrote it last, and the reloaded editor offers
   * them. When the copy can't be kept, the browser's own leave warning still asks.
   */
  function reloadAfterConflict() {
    const latest = save.latest();
    const kept =
      !latest.unsent ||
      (found.key !== null &&
        writeUnsentCopy(window.localStorage, found.key, {
          document: state.document,
          baseDraftRevision: latest.draftRevision,
          savedAt: Date.now(),
          tab: found.tabs[0],
        }));
    if (kept) setReloading(true);
    else window.location.reload();
  }

  const pickPage = (next: PageKey) => dispatch({ type: "pickPage", page: next });

  let previewNote: ReactNode = null;
  const framePath = preview.state.path;
  if (framePath && !isGroupPage(page) && templateForPath(framePath) !== page) {
    const target = targetFor(page, framePath);
    if (target && "missing" in target) {
      previewNote = <span className="truncate">{t(MISSING_NOTE[target.missing])}</span>;
    } else if (templateForPath(framePath) === null) {
      previewNote = (
        <>
          <span className="truncate">{t("previewCantCustomize")}</span>
          {target ? (
            <button
              type="button"
              onClick={() => show(target.path)}
              className="shrink-0 rounded-ui px-1 py-0.5 font-medium text-foreground underline underline-offset-2"
            >
              {t("previewShowPage", { page: pageName })}
            </button>
          ) : null}
        </>
      );
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorTopBar
        manifest={manifest}
        saveStatus={save.status}
        onRetrySave={() => void save.flush()}
        page={page}
        onPickPage={pickPage}
        device={device}
        onDevice={setDevice}
        onClose={() => void handleClose()}
      />

      <SaveProblem status={save.status} manifest={manifest} onReload={reloadAfterConflict} />

      {copyNotice ? (
        <div
          role={copyNotice === "ask" ? "alert" : "status"}
          className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-muted/50 px-4 py-2 text-sm text-foreground"
        >
          <p className="min-w-0 flex-1">{copyNotice === "ask" ? t("unsentAsk") : t("unsentRestored")}</p>
          {copyNotice === "ask" ? (
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => answerCopy(true, found.copy)}>
                {t("unsentRestore")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => answerCopy(false, null)}>
                {t("unsentDiscard")}
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setCopyNotice(null)}>
              {tCommon("close")}
            </Button>
          )}
        </div>
      ) : null}

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
          className={cn("min-h-0 min-w-0 flex-1 md:flex", tab === "preview" ? "flex" : "hidden")}
        >
          <PreviewPane origin={origin} width={width} session={preview} note={previewNote} />
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
