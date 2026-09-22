"use client";

import { useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { Select } from "@/components/ui/select";
import { notify } from "@/notifications";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { CUSTOMIZATION_HREF } from "@/lib/theme-editor/access";
import {
  discardThemeDraft,
  fetchThemeEditor,
  publishThemeDraft,
  themeErrorMessageKey,
  type ThemeEditorState,
} from "@/lib/theme-editor/api";
import {
  actionProblem,
  saveToShop,
  loadLatest,
  keepMyVersion,
  type EditorActionResult,
  type EditorPorts,
} from "@/lib/theme-editor/editor-actions";
import { editorReducer, initEditorState } from "@/lib/theme-editor/editor-reducer";
import {
  initialChoices,
  PAGE_NOTES,
  SLOT_GROUPS,
  SLOT_PAGES,
  type SlotPageKey,
} from "@/lib/theme-editor/slot-catalogue";
import { choiceEdits, settingEdits, wiringFor } from "@/lib/theme-editor/slot-sections";
import { themesQueryKey } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { ConflictDialog } from "../ConflictDialog";
import { SaveStatus } from "../SaveStatus";
import { useAutosave } from "../useAutosave";
import { SlotCanvas } from "./SlotCanvas";
import { StylePanel } from "./StylePanel";

/**
 * The theme editor, built around slots.
 *
 * **Being wired, one place at a time.** A place listed in `slot-sections.ts` is
 * real: its choice is read from this shop's own document and every edit is
 * written back to it, saved as a draft on its own and put on the shop when the
 * merchant presses Save. Every other place is still the drawing it was, with
 * its choice held in this component -- so the screen can be argued with before
 * the section behind it is built.
 *
 * The announcement bar is the first, because it is the only section finished on
 * both sides: six settings the storefront draws, and two live shops already
 * showing it.
 *
 * What the owner asked for, on 2026-09-20 and 2026-09-22:
 *
 *   no sidebar        the canvas fills the editor
 *   click the page    a merchant clicks the section they want, where it sits
 *   fixed places      nothing drags and nothing reorders; a merchant adds a
 *                     section, removes one, and edits the ones that are there
 *   no history        a save goes on the shop; there is no version to go back to
 *   premium in view   a paid option shows its badge in the list, so a merchant
 *                     sees what the tier adds before they pay for it
 */
export function SlotEditor({ loaded }: { loaded: ThemeEditorState }) {
  const t = useTranslations("themeEditor.slots");
  const tEditor = useTranslations("themeEditor");
  const tc = useTranslations("settings.customization");
  const qc = useQueryClient();

  const [state, dispatch] = useReducer(editorReducer, loaded, (value) => initEditorState(value));
  const [page, setPage] = useState<SlotPageKey>("home");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [open, setOpen] = useState<string | null>("promo");
  const [palette, setPalette] = useState("ivory");
  const [face, setFace] = useState("poppins");
  const [corner, setCorner] = useState("soft");
  const [cardStyle, setCardStyle] = useState("classic");
  // One whole-theme action at a time (Save, answering a clash).
  const [busy, setBusy] = useState(false);
  // The clash waiting for an answer, and where the draft stands so it can be saved over.
  const [conflict, setConflict] = useState<{ draftRevision: number | null } | null>(null);
  const [choices, setChoices] = useState<Record<SlotPageKey, Record<string, string>>>(() => ({
    home: initialChoices("home"),
    category: initialChoices("category"),
    product: initialChoices("product"),
    search: initialChoices("search"),
    wishlist: initialChoices("wishlist"),
    account: initialChoices("account"),
    blog: initialChoices("blog"),
    article: initialChoices("article"),
    cart: initialChoices("cart"),
    checkout: initialChoices("checkout"),
    header: initialChoices("header"),
    footer: initialChoices("footer"),
  }));

  const save = useAutosave({ loaded, document: state.document, onSaved: () => {} });

  function pickPage(next: SlotPageKey) {
    setPage(next);
    setOpen(null);
  }

  /**
   * A choice: written to the shop's document when the place is wired, kept in
   * this component when it is still a drawing.
   */
  function choose(slotPage: SlotPageKey, slotKey: string, value: string) {
    const wiring = wiringFor(slotPage, slotKey);
    if (!wiring) {
      setChoices((all) => ({ ...all, [slotPage]: { ...all[slotPage], [slotKey]: value } }));
      return;
    }
    for (const edit of choiceEdits(state.document, wiring, value)) dispatch(edit);
  }

  function setSetting(slotPage: SlotPageKey, slotKey: string, setting: string, value: unknown) {
    const wiring = wiringFor(slotPage, slotKey);
    if (!wiring) return;
    for (const edit of settingEdits(state.document, wiring, setting, value)) dispatch(edit);
  }

  const ports = (): EditorPorts => ({
    autosave: save.control,
    publish: (expected) => publishThemeDraft(api, expected),
    discard: (expected) => discardThemeDraft(api, expected),
    reload: () => fetchThemeEditor(api),
    load: (next) => dispatch({ type: "load", document: next.document, manifest: next.manifest }),
    // No preview frame on this screen: the canvas draws the document it is holding,
    // so there is nothing to tell about a save.
    refreshPreview: () => {},
    // No copy of unsent edits is kept on the device yet, so there is none to forget.
    forgetDeviceCopy: () => {},
    // Customization reads the library again for its Live and Draft badges.
    themesChanged: () => void qc.resetQueries({ queryKey: themesQueryKey }),
  });

  /**
   * Runs one whole-theme action. A clash is a question, so it opens the dialog
   * rather than a toast; anything else says what happened.
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
      else if (tell.kind === "blockedInvalid")
        notify.warning(tEditor("saveBlockedInvalid"), { title: tEditor("saveBlockedTitle") });
      else notify.warning(tEditor("saveBlocked"), { title: tEditor("saveBlockedTitle") });
    } finally {
      setBusy(false);
    }
  }

  const handleSave = () =>
    void run(() => saveToShop(ports()), () =>
      notify.success(tEditor("savedToShop"), { title: tc("heading") }),
    );
  const answered = () => setConflict(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-3 md:px-4">
        {/*
          The way out. This screen fills the window with no dashboard around it,
          so without this a merchant's only exit is the browser's back button --
          and the X at the far left is where the editor has always kept it.

          A link and not a button: it is a navigation, so it opens in a new tab
          on a middle click and reads as an address to a screen reader.
        */}
        <Button asChild type="button" variant="ghost" size="icon" className="size-9 shrink-0">
          <DeferredNavLink href={CUSTOMIZATION_HREF} aria-label={tEditor("close")} title={tEditor("close")}>
            <X aria-hidden />
          </DeferredNavLink>
        </Button>

        <Select
          aria-label={tEditor("pageLabel")}
          value={page}
          onChange={(event) => pickPage(event.target.value as SlotPageKey)}
          className="w-auto min-w-[10rem]"
        >
          <optgroup label={tEditor("pagesGroup")}>
            {SLOT_PAGES.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </optgroup>
          <optgroup label={tEditor("everyPageGroup")}>
            {SLOT_GROUPS.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </optgroup>
        </Select>

        <p role="status" className="text-xs text-muted-foreground">
          {open ? t("hintChoosing") : t("hintClick")}
        </p>

        <div className="flex-1" />

        <SaveStatus status={save.status} onRetry={() => void save.control.flush()} />

        <div
          role="group"
          aria-label={tEditor("previewSize")}
          className="inline-flex overflow-hidden rounded-sm border border-border-subtle"
        >
          {(
            [
              ["desktop", Monitor, tEditor("desktop")],
              ["mobile", Smartphone, tEditor("phone")],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
              title={label}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                device === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <Button type="button" size="sm" disabled={busy} onClick={handleSave}>
          {tEditor("saveToShop")}
        </Button>
      </div>

      {/*
        Said plainly, and it names what IS wired rather than claiming the screen
        works. A screen that looks finished and saves half of what it shows is
        worse than one that says which half.
      */}
      <p className="border-b border-border bg-[hsl(var(--accent-yellow)/0.1)] px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
        {t("partlyWired")}
      </p>

      {/*
        A second, different warning, and only on the pages that need it.

        The line above says which places on this SCREEN save. This one says the
        PAGE itself does not exist yet -- the wishlist and the account are
        placeholders in the shop with no feature behind them. They are not the
        same admission, and a merchant who reads only the first would come away
        believing the wrong thing.
      */}
      {PAGE_NOTES[page] ? (
        <p className="border-b border-border bg-muted px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {t(PAGE_NOTES[page])}
        </p>
      ) : null}

      {/*
        Two fifths for colour and type, three for the page.

        With one theme and fixed places, the palette and the face are what make
        two shops look different -- so they are not a tab somewhere, they are
        half the screen. On a narrow window they stack above the page rather
        than squeezing: a 40% column of swatches is unusable at that width.
      */}
      {/*
        Two panes that scroll on their own, and one column that scrolls as a
        whole when there is no room for two.

        `overflow-hidden` on the container is what makes the panes scrollable at
        all: a grid item stretches to the row, but a child with `overflow-y-auto`
        and no height of its own just grows past it and the scrollbar never
        appears. The container has to refuse to grow first.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[2fr_3fr] lg:overflow-hidden">
        <div className="shrink-0 border-b border-border lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <StylePanel
            palette={palette}
            onPalette={setPalette}
            face={face}
            onFace={setFace}
            corner={corner}
            onCorner={setCorner}
            cardStyle={cardStyle}
            onCardStyle={setCardStyle}
          />
        </div>
        <div className="lg:min-h-0 lg:overflow-y-auto">
          <SlotCanvas
            page={page}
            device={device}
            open={open}
            onOpen={setOpen}
            choices={choices[page]}
            onChoose={(slotKey, value) => choose(page, slotKey, value)}
            allChoices={choices}
            document={state.document}
            manifest={state.manifest}
            onSet={(slotKey, setting, value) => setSetting(page, slotKey, setting, value)}
            onGoToPage={(next, slotKey) => {
              setPage(next);
              setOpen(slotKey);
            }}
          />
        </div>
      </div>

      <ConflictDialog
        open={conflict !== null}
        busy={busy}
        canKeepMine={conflict?.draftRevision != null}
        hasUnsent={save.unsent}
        onLoadLatest={() => void run(() => loadLatest(ports()), answered)}
        onKeepMine={() =>
          conflict?.draftRevision != null
            ? void run(() => keepMyVersion(ports(), conflict.draftRevision as number), answered)
            : undefined
        }
      />
    </div>
  );
}
