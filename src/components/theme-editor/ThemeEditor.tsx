"use client";

import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";

import { usePreviewDevice } from "@/components/preview-system/usePreviewDevice";
import { Button } from "@/components/ui/button";
import { useConfirm, type ConfirmDialogOptions } from "@/context/ConfirmDialogContext";
import { usePreviewExamplesQuery, useThemeImagesQuery } from "@/hooks/useThemesQuery";
import api from "@/lib/api";
import { liveStorefrontDomain, storefrontUrlFor } from "@/lib/domains/api";
import { useDomainsQuery } from "@/lib/domains/hooks";
import { getMeProfileKeyFromToken } from "@/lib/me-profile-store";
import { themeEditorVersionsQueryKey, themesQueryKey } from "@/lib/query-keys";
import {
  discardThemeDraft,
  fetchThemeEditor,
  publishThemeDraft,
  restoreThemeVersion,
  themeErrorMessageKey,
  type ThemeBlock,
  type ThemeEditorState,
  type ThemeImage,
  type ThemeSection,
  type ThemeVersion,
} from "@/lib/theme-editor/api";
import {
  actionProblem,
  discardDraft,
  keepMyVersion,
  leaveChoice,
  loadLatest,
  restoreVersion,
  saveToShop,
  type EditorActionResult,
  type EditorPorts,
} from "@/lib/theme-editor/editor-actions";
import { versionNumber } from "@/lib/theme-editor/versions";
import { notify } from "@/notifications";
import {
  editorPages,
  isGroupPage,
  localLabel,
  pageSections,
  pageSpec,
  type PageKey,
} from "@/lib/theme-editor/document-ops";
import { editorReducer, initEditorState } from "@/lib/theme-editor/editor-reducer";
import { blockChoices, fieldValue, type FieldSpec } from "@/lib/theme-editor/field-specs";
import { linkPages } from "@/lib/theme-editor/link-targets";
import { pathLocale, previewTarget, templateForPath } from "@/lib/theme-editor/preview-paths";
import { cannotAdd, cannotAddBlock } from "@/lib/theme-editor/rules";
import { documentProblem } from "@/lib/theme-editor/validate";
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
import { AddSheet, type AddItem } from "./AddSheet";
import { CloseSheet } from "./CloseSheet";
import { ConflictDialog } from "./ConflictDialog";
import { EditorTopBar, PagePicker } from "./EditorTopBar";
import { LinkPicker } from "./LinkPicker";
import { PicturePicker } from "./PicturePicker";
import { PreviewPane } from "./PreviewPane";
import { SaveProblem } from "./SaveStatus";
import { SectionList } from "./SectionList";
import { SettingsPanel } from "./SettingsPanel";
import { VersionHistorySheet } from "./VersionHistorySheet";
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

/**
 * What is open over the left column: adding a section or a part, picking a link, the saves this
 * shop can go back to, or the three choices for leaving with a draft.
 */
type SheetKind =
  | { kind: "addSection" }
  | { kind: "addBlock" }
  | { kind: "link"; setting: string; value: string }
  | { kind: "picture"; setting: string; value: string }
  | { kind: "history" }
  | { kind: "leave" };

/** The sheets that belong to an open section, so closing it closes them. */
const SECTION_SHEETS = ["addBlock", "link"];

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
  const stored = key ? readUnsentCopy(window.localStorage, key) : null;
  // Written by an editor working from an older theme file: a value it was allowed to store
  // then may be one the API refuses now, and bringing it back would stop every save.
  const copy = stored && documentProblem(loaded.manifest, stored.document) === null ? stored : null;
  const choice = unsentCopyChoice(copy, { document: loaded.document, draftRevision: loaded.draft_revision });
  // The copies this tab may replace: its own (a new id each time the editor opens) and the one found now.
  const tabs = [Math.random().toString(36).slice(2), stored?.tab] as const;
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
  const tc = useTranslations("settings.customization");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const confirm = useConfirm();
  const qc = useQueryClient();
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
  // The section (and, inside it, the part) whose settings are open, and the sheet over it.
  const [open, setOpen] = useState<{ sectionId: string; blockId?: string } | null>(null);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  // Pictures this shop has already placed, and the URLs of ones placed since the
  // list was read: an upload answers with a key alone, and a field needs a URL.
  const images = useThemeImagesQuery({ enabled: true });
  const [pictureUrls, setPictureUrls] = useState<Record<string, string>>({});
  const [focusRequest, setFocusRequest] = useState<{ id: string | null } | null>(null);
  // A whole-theme action is running (Save, Discard, Restore, answering a clash): one at a time.
  const [busy, setBusy] = useState(false);
  // The clash waiting for an answer, and where the draft stands now so it can be saved over.
  const [conflict, setConflict] = useState<{ draftRevision: number | null } | null>(null);
  const dialogOpen = useRef(false);
  const closing = useRef(false);

  const { manifest, page } = state;
  // Absent means yes: an older API build says nothing, and locking a paying
  // shop out of its own sections is the worse way to be wrong.
  const premiumSections = loaded.premium_sections !== false;
  const spec = pageSpec(manifest, page);
  const pageName = spec ? localLabel(spec, locale) : page;
  const allowed = spec?.sections ?? [];
  const sections = pageSections(state.document, page);
  const sectionName = (section: ThemeSection) => {
    const sectionSpec = manifest.sections[section.type];
    return sectionSpec ? localLabel(sectionSpec, locale) : section.type;
  };

  // The open panel follows the document: a section removed here, or a page picked there,
  // closes it rather than leaving the settings of something that is no longer on the page.
  const openSection = open ? (sections.find((s) => s.id === open.sectionId) ?? null) : null;
  const openBlock =
    openSection && open?.blockId ? (openSection.blocks.find((b) => b.id === open.blockId) ?? null) : null;
  useEffect(() => {
    if (!open) return;
    if (!openSection) setOpen(null);
    else if (open.blockId && !openBlock) setOpen({ sectionId: open.sectionId });
  }, [open, openSection, openBlock]);
  useEffect(() => {
    if (!open) setSheet((current) => (current && SECTION_SHEETS.includes(current.kind) ? null : current));
  }, [open]);

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
  // Where "View shop" goes after a save: the address shoppers reach this shop on. A member who
  // may not read the shop's domains gets the message without the link.
  const domains = useDomainsQuery();
  const liveDomain = liveStorefrontDomain(domains.data);
  const shopUrl = liveDomain ? storefrontUrlFor(liveDomain.hostname) : null;

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

  // A clash autosave ran into by itself, rather than one this editor asked for.
  useEffect(() => {
    if (save.status.kind === "conflict") setConflict({ draftRevision: save.status.draftRevision });
  }, [save.status]);

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
    changed: unsent,
    onBack: () => {
      // Back never stacks a second dialog, and closes one open layer at a time: the sheet
      // over the panel, then the part inside a section, then the section, then the editor.
      if (dialogOpen.current) return false;
      if (sheet) {
        setSheet(null);
        return false;
      }
      if (open?.blockId) {
        setOpen({ sectionId: open.sectionId });
        return false;
      }
      if (open) {
        setOpen(null);
        return false;
      }
      if (!unsent && !save.hasDraft) return true;
      void handleClose();
      return false;
    },
  });

  /**
   * Send what is waiting first, then ask what the draft should do: put it on the shop, keep it
   * for later, or throw it away. Edits that could not be sent at all get the older warning —
   * they are on this device, not on the server, so there is no draft to decide about.
   */
  async function handleClose() {
    // Not while a whole-theme action is running: the question to ask depends on what it leaves.
    if (closing.current || busy) return;
    closing.current = true;
    try {
      await save.flush();
      const choice = leaveChoice(save.latest());
      if (choice === "askUnsaved") {
        if (await confirmLeave()) leave();
      } else if (choice === "askDraft") {
        setSheet({ kind: "leave" });
      } else {
        leave();
      }
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
    setSheet(null);
    if (next === state) return;
    dispatch({ type: "add", sectionType: type });
    const added = pageSections(next.document, page).at(-1);
    setFocusRequest({ id: added?.id ?? null });
  }

  /** Every setting change goes through the reducer, which refuses what the API would. */
  function handleSet(setting: string, value: unknown) {
    if (!open) return;
    dispatch({ type: "setSetting", id: open.sectionId, blockId: open.blockId, setting, value });
  }

  function handlePickLink(link: string) {
    if (sheet?.kind !== "link") return;
    handleSet(sheet.setting, link);
    setSheet(null);
  }

  function openLinkPicker(spec: FieldSpec) {
    setSheet({ kind: "link", setting: spec.id, value: openSettingText(spec) });
  }

  function openPicturePicker(spec: FieldSpec) {
    setSheet({ kind: "picture", setting: spec.id, value: openSettingText(spec) });
  }

  /** What the open section or block holds in one setting, as text. */
  function openSettingText(spec: FieldSpec): string {
    const settings = openBlock ? openBlock.settings : openSection?.settings;
    const value = fieldValue(spec, settings);
    return typeof value === "string" ? value : "";
  }

  function handlePickPicture(picture: ThemeImage) {
    if (sheet?.kind !== "picture") return;
    handleSet(sheet.setting, picture.key);
    // Drawn from the picker's own answer until the list is read again: the upload
    // hands back a key and no URL, so without this the field would show a gap.
    if (picture.url) setPictureUrls((known) => ({ ...known, [picture.key]: picture.url }));
    setSheet(null);
  }

  async function handleRemoveBlock(block: ThemeBlock) {
    if (!openSection) return;
    const spec = manifest.sections[openSection.type]?.blocks?.[block.type];
    const ok = await ask({
      title: t("confirmRemoveTitle", { name: spec ? localLabel(spec, locale) : block.type }),
      message: t("confirmRemoveBlockMessage"),
      confirmText: t("confirmRemove"),
      cancelText: tCommon("cancel"),
      variant: "danger",
    });
    if (!ok) return;
    dispatch({ type: "removeBlock", id: openSection.id, blockId: block.id });
  }

  /** Drop the unsent edits this device was keeping, and the notice that offered them back. */
  function forgetCopy() {
    if (found.key && mayReplaceUnsentCopy(readUnsentCopy(window.localStorage, found.key), found.tabs)) {
      clearUnsentCopy(window.localStorage, found.key);
    }
    setCopyNotice(null);
  }

  function answerCopy(restore: boolean, copy: UnsentCopy | null) {
    if (restore && copy) {
      dispatch({ type: "restore", document: copy.document });
      setCopyNotice(null);
    } else {
      forgetCopy();
    }
  }

  const ports = (): EditorPorts => ({
    autosave: save.control,
    publish: (expected) => publishThemeDraft(api, expected),
    discard: (expected) => discardThemeDraft(api, expected),
    restore: (revision, expected) => restoreThemeVersion(api, revision, expected),
    reload: () => fetchThemeEditor(api),
    load: (next) => dispatch({ type: "load", document: next.document, manifest: next.manifest }),
    refreshPreview: (version) => preview.saved(version),
    forgetDeviceCopy: forgetCopy,
    themesChanged: () => {
      // Customization reads the library again for its Live and Draft badges, and the history
      // sheet reads its list again, because a save adds a version to it.
      void qc.resetQueries({ queryKey: themesQueryKey });
      qc.removeQueries({ queryKey: themeEditorVersionsQueryKey });
    },
  });

  /**
   * Runs one whole-theme action. A clash is a question, so it keeps (or reopens) the dialog
   * instead of a toast; anything else says what happened, and takes the dialog away when its
   * two answers cannot help any more.
   */
  async function run(action: () => Promise<EditorActionResult>, onDone: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        onDone();
        return;
      }
      const { clash, tell } = actionProblem(result, save.latest().status);
      setConflict(clash);
      if (!tell) return;
      if (tell.kind === "error") notify.warning(tc(themeErrorMessageKey(tell.error)), { title: tc("heading") });
      else if (tell.kind === "blockedInvalid") notify.warning(t("saveBlockedInvalid"), { title: t("saveBlockedTitle") });
      else notify.warning(t("saveBlocked"), { title: t("saveBlockedTitle") });
    } finally {
      setBusy(false);
    }
  }

  /** Said the same way wherever the merchant pressed Save or Discard: the top bar, or on leaving. */
  const savedNotice = () =>
    notify.success(t("savedToShop"), {
      title: tc("heading"),
      // Longer than a success toast's own four seconds: saving on the way out leaves the editor,
      // and the link would be gone before the page behind it had finished arriving.
      durationMs: 10_000,
      action: shopUrl
        ? { label: t("viewShop"), onClick: () => window.open(shopUrl, "_blank", "noopener,noreferrer") }
        : undefined,
    });
  const discardedNotice = () => notify.success(t("draftDiscarded"), { title: tc("heading") });

  const handleSave = () => void run(() => saveToShop(ports()), savedNotice);

  async function handleDiscard() {
    const ok = await ask({
      title: t("confirmDiscardTitle"),
      message: t("confirmDiscardMessage"),
      confirmText: t("confirmDiscard"),
      cancelText: t("keepEditing"),
      variant: "danger",
    });
    if (!ok) return;
    await run(() => discardDraft(ports()), discardedNotice);
  }

  async function handleRestore(version: ThemeVersion) {
    const number = versionNumber(version.revision, locale);
    const ok = await ask({
      title: t("confirmRestoreTitle", { number }),
      message: t("confirmRestoreMessage"),
      confirmText: t("confirmRestore"),
      cancelText: tCommon("cancel"),
      variant: "warning",
    });
    if (!ok) return;
    setSheet(null);
    await run(
      () => restoreVersion(ports(), version.revision),
      () => notify.info(t("restoredToDraft", { number }), { title: tc("heading") }),
    );
  }

  /** Load latest gives up this editor's unsent edits; keeping mine replaces the other draft. */
  const answered = () => setConflict(null);
  const handleLoadLatest = () => void run(() => loadLatest(ports()), answered);
  const handleKeepMine = (draftRevision: number) =>
    void run(() => keepMyVersion(ports(), draftRevision), answered);

  const pickPage = (next: PageKey) => dispatch({ type: "pickPage", page: next });

  // What the two Add sheets offer: the theme's list, with the ones the rules refuse listed
  // but not offered, so a merchant sees what the page could hold and why it cannot now.
  const sectionItems: AddItem[] = allowed.map((type) => {
    const refused = cannotAdd(manifest, allowed, sections, type, premiumSections);
    const spec = manifest.sections[type];
    return {
      key: type,
      label: spec ? localLabel(spec, locale) : type,
      note:
        refused === "onlyOnce"
          ? t("alreadyOnPage")
          : // Listed rather than hidden, and named: a merchant should be able to
            // see what their shop could have, and why it cannot have it yet.
            refused === "premium"
            ? t("premiumSection")
            : undefined,
      disabled: refused !== null,
    };
  });
  const blockItems: AddItem[] = openSection
    ? blockChoices(manifest.sections[openSection.type], locale).map(({ type, label }) => ({
        key: type,
        label,
        disabled: cannotAddBlock(manifest, openSection, type) !== null,
      }))
    : [];

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
        hasDraft={save.hasDraft}
        canSave={save.hasDraft || save.unsent}
        busy={busy}
        onSave={handleSave}
        onHistory={() => setSheet({ kind: "history" })}
        onDiscard={() => void handleDiscard()}
        onClose={() => void handleClose()}
      />

      <SaveProblem status={save.status} manifest={manifest} />

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
          {openSection ? (
            <SettingsPanel
              manifest={manifest}
              section={openSection}
              block={openBlock}
              onBack={() => setOpen(openBlock ? { sectionId: openSection.id } : null)}
              onSet={handleSet}
              onPickLink={openLinkPicker}
              onPickPicture={openPicturePicker}
              pictureUrl={(key) =>
                pictureUrls[key] ?? images.data?.find((row) => row.key === key)?.url ?? ""
              }
              onOpenBlock={(block) => setOpen({ sectionId: openSection.id, blockId: block.id })}
              onAddBlock={() => setSheet({ kind: "addBlock" })}
              onRemoveBlock={(block) => void handleRemoveBlock(block)}
              onMoveBlock={(blockId, to) => dispatch({ type: "moveBlock", id: openSection.id, blockId, to })}
            />
          ) : (
            <SectionList
              manifest={manifest}
              pageName={pageName}
              isGroup={isGroupPage(page)}
              allowed={allowed}
              sections={sections}
              focusRequest={focusRequest}
              onOpen={(section) => setOpen({ sectionId: section.id })}
              onHide={(id) => dispatch({ type: "hide", id })}
              onShow={(id) => dispatch({ type: "show", id })}
              onMove={(id, to) => dispatch({ type: "move", id, to })}
              onRemove={(section) => void handleRemove(section)}
              onAdd={() => setSheet({ kind: "addSection" })}
            />
          )}
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

      <AddSheet
        open={sheet?.kind === "addSection"}
        title={t("addTitle")}
        hint={t("addHint")}
        items={sectionItems}
        onPick={handleAdd}
        onClose={() => setSheet(null)}
      />

      <AddSheet
        open={sheet?.kind === "addBlock"}
        title={t("addBlockTitle")}
        hint={t("addBlockHint")}
        items={blockItems}
        onPick={(type) => {
          setSheet(null);
          if (openSection) dispatch({ type: "addBlock", id: openSection.id, blockType: type });
        }}
        onClose={() => setSheet(null)}
      />

      <LinkPicker
        open={sheet?.kind === "link"}
        pages={linkPages(state.document)}
        value={sheet?.kind === "link" ? sheet.value : ""}
        onPick={handlePickLink}
        onClose={() => setSheet(null)}
      />

      <PicturePicker
        open={sheet?.kind === "picture"}
        used={images.data ?? []}
        current={sheet?.kind === "picture" ? sheet.value : ""}
        onPick={handlePickPicture}
        onClose={() => setSheet(null)}
      />

      <VersionHistorySheet
        open={sheet?.kind === "history"}
        busy={busy}
        onRestore={(version) => void handleRestore(version)}
        onClose={() => setSheet(null)}
      />

      <CloseSheet
        open={sheet?.kind === "leave"}
        busy={busy}
        onSave={() =>
          void run(
            () => saveToShop(ports()),
            () => {
              savedNotice();
              setSheet(null);
              leave();
            },
          )
        }
        onKeep={() => {
          setSheet(null);
          leave();
        }}
        onDiscard={() =>
          void run(
            () => discardDraft(ports()),
            () => {
              discardedNotice();
              setSheet(null);
              leave();
            },
          )
        }
        onClose={() => setSheet(null)}
      />

      <ConflictDialog
        open={conflict !== null}
        busy={busy}
        canKeepMine={conflict?.draftRevision != null}
        hasUnsent={save.unsent}
        onLoadLatest={handleLoadLatest}
        onKeepMine={() => {
          if (conflict?.draftRevision != null) handleKeepMine(conflict.draftRevision);
        }}
      />
    </div>
  );
}
