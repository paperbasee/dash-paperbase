"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the screen matches a media query, kept current as it changes. False
 * on the server and on the first paint, so what renders first is the phone's
 * layout -- the one that is right on the most screens a merchant opens the
 * editor on.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
