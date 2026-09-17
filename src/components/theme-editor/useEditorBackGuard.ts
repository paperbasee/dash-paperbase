"use client";

import { useCallback, useEffect, useRef } from "react";

import { useRouter } from "@/i18n/navigation";
import { CUSTOMIZATION_HREF } from "@/lib/theme-editor/access";

const GUARD_KEY = "pbThemeEditorGuard";

/**
 * Browser Back (Android's Back included), refresh, and leaving the editor.
 *
 * The editor keeps one extra history entry at its own address, so Back lands on the
 * editor again instead of leaving it, and `onBack` decides: close an open panel or ask
 * about unsaved changes (return false, and the entry is put back), or leave for real
 * (return true). The entry holds no URL change, so Next's router restores the same page
 * and nothing remounts. A refresh or closing the tab with changes gets the browser's own
 * warning.
 *
 * Leaving, by Back or by the returned `leave` (Close, or Leave in the warning), never
 * leaves an editor entry behind for Back to reopen: it goes back to Customization when the
 * editor was opened from it, else the editor's entry becomes Customization.
 */
export function useEditorBackGuard({
  changed,
  onBack,
}: {
  changed: boolean;
  /** True to leave; false to stay (the editor handles the Back itself). */
  onBack: () => boolean;
}) {
  const router = useRouter();
  const latest = useRef({ changed, onBack, router });
  useEffect(() => {
    latest.current = { changed, onBack, router };
  });
  const leaving = useRef(false);

  useEffect(() => {
    const path = window.location.pathname;
    const guard = window.history.state?.[GUARD_KEY];
    // Opened from a dashboard page, so the entry before the editor is that page. Not when
    // the browser loaded this address itself (a new tab, a typed or shared link). A refresh,
    // or React mounting twice in development, finds the guard entry and its first answer.
    const fromApp: boolean = guard
      ? guard.fromApp === true
      : performance.getEntriesByType("navigation").some((entry) => new URL(entry.name).pathname !== path);
    const pushGuard = () => window.history.pushState({ [GUARD_KEY]: { fromApp } }, "");
    if (!guard) pushGuard();

    const onPopState = () => {
      // The address changed: Next is already leaving for another page.
      if (window.location.pathname !== path) return;
      // Now on the editor's own entry, with the guard entry after it.
      if (!leaving.current && !latest.current.onBack()) {
        pushGuard();
        return;
      }
      leaving.current = true;
      if (fromApp) window.history.back();
      else latest.current.router.replace(CUSTOMIZATION_HREF);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!latest.current.changed) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  /** Leaves the editor without asking: ask about unsaved changes first. */
  return useCallback(() => {
    leaving.current = true;
    window.history.back();
  }, []);
}
