"use client";

import { useEffect, useRef, useState } from "react";

import api from "@/lib/api";
import { saveThemeDraft, type ThemeDocument, type ThemeEditorState } from "@/lib/theme-editor/api";
import { createAutosave, type AutosaveSnapshot } from "@/lib/theme-editor/autosave";

/**
 * Saves the editor's document as the private draft once edits settle (lib/theme-editor/autosave),
 * and at once when the tab is hidden or closed.
 */
export function useAutosave({
  loaded,
  document,
  onSaved,
}: {
  loaded: ThemeEditorState;
  document: ThemeDocument;
  onSaved: (previewVersion: string) => void;
}) {
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });

  const onChangeRef = useRef<(snapshot: AutosaveSnapshot) => void>(() => {});
  const [autosave] = useState(() =>
    createAutosave({
      document: loaded.document,
      draftRevision: loaded.draft_revision,
      hasDraft: loaded.has_draft,
      send: (doc, expectedDraftRevision) => saveThemeDraft(api, doc, expectedDraftRevision),
      onChange: (next) => onChangeRef.current(next),
      onSaved: (version) => onSavedRef.current(version),
    }),
  );
  const [snapshot, setSnapshot] = useState(autosave.snapshot);
  useEffect(() => {
    onChangeRef.current = setSnapshot;
  }, []);

  useEffect(() => {
    autosave.edit(document);
  }, [autosave, document]);

  useEffect(() => {
    const onHidden = () => {
      if (window.document.visibilityState === "hidden") void autosave.flush();
    };
    const onPageHide = () => void autosave.flush();
    window.document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      // Leaving the editor sends what is waiting rather than dropping it.
      void autosave.flush();
    };
  }, [autosave]);

  return { ...snapshot, flush: autosave.flush, latest: autosave.snapshot };
}
