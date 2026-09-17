"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { themeEditorExamplesQueryKey, themeEditorQueryKey, themesQueryKey } from "@/lib/query-keys";
import {
  discardThemeDraft,
  fetchThemeEditor,
  fetchThemeLibrary,
  selectTheme,
} from "@/lib/theme-editor/api";
import { fetchPreviewExamples } from "@/lib/theme-editor/preview-paths";

/**
 * The theme library for Settings > Customization.
 *
 * Kept out of IndexedDB and never refetched on focus or reconnect: the page holds
 * the draft revision the next select or discard sends, and a background refetch
 * must not swap it (or the list) under a merchant who is mid-choice. A change made
 * elsewhere surfaces as a 409 on the next action, which refetches.
 */
export function useThemesQuery({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: themesQueryKey,
    queryFn: () => fetchThemeLibrary(api),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: { persist: false },
  });
}

/**
 * What the theme editor opens with. It fills the editor once: never kept in IndexedDB,
 * dropped as soon as the editor closes (gcTime 0) so the next visit loads the latest
 * draft, and never refetched in the background. A refusal is final (a 403 means the
 * member may not edit or the shop is locked), so it is not retried.
 */
export function useThemeEditorQuery({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: themeEditorQueryKey,
    queryFn: () => fetchThemeEditor(api),
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    meta: { persist: false },
  });
}

/**
 * A real category, product and blog post for the editor's page picker to show, read once when
 * the editor opens. Like the editor's own query: not persisted, dropped when the editor closes.
 */
export function usePreviewExamplesQuery() {
  return useQuery({
    queryKey: themeEditorExamplesQueryKey,
    // Fails only when a read got no answer: retried, and again when the tab or the connection
    // comes back. Once loaded it is never refetched (staleTime).
    queryFn: () => fetchPreviewExamples(api),
    staleTime: Infinity,
    gcTime: 0,
    meta: { persist: false },
  });
}

/**
 * Select and discard both change only the private draft. Success or failure, the
 * library is refetched (a failure may mean the draft moved or access changed), and
 * any editor state loaded earlier is dropped so the editor opens on the new draft.
 */
function useThemeDraftMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => {
      qc.removeQueries({ queryKey: themeEditorQueryKey });
      return qc.invalidateQueries({ queryKey: themesQueryKey });
    },
  });
}

export function useSelectTheme() {
  return useThemeDraftMutation(
    ({ themeKey, expectedDraftRevision }: { themeKey: string; expectedDraftRevision: number }) =>
      selectTheme(api, themeKey, expectedDraftRevision),
  );
}

export function useDiscardThemeDraft() {
  return useThemeDraftMutation((expectedDraftRevision: number) =>
    discardThemeDraft(api, expectedDraftRevision),
  );
}
