"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { themeEditorQueryKey, themesQueryKey } from "@/lib/query-keys";
import { discardThemeDraft, fetchThemeLibrary, selectTheme } from "@/lib/theme-editor/api";

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
