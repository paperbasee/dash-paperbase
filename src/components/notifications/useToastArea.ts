"use client";

import { useEffect, type RefObject } from "react";

/**
 * What the pop-up notes centre in, and what they rise above (owner, 2026-09-29): a screen with no
 * sidebar, or with a panel of its own, says so here, and `globals.css` / `NotificationViewport`
 * read it. Only while the screen is open -- leaving puts the dashboard's rule back.
 *
 *   --toast-area-left    what to leave out on the left; unset, the sidebar
 *   --toast-area-right   a panel along the right edge, measured
 *   --toast-sheet        a sheet along the bottom of a phone, measured; notes sit above it
 */
export function useToastAreaLeft(value: string): void {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--toast-area-left", value);
    return () => {
      root.style.removeProperty("--toast-area-left");
    };
  }, [value]);
}

/** Keep the notes clear of this element -- a right-hand panel, or a bottom sheet -- while it shows. */
export function useToastAvoid(ref: RefObject<HTMLElement | null>, edge: "right" | "bottom", showing: boolean): void {
  useEffect(() => {
    const element = ref.current;
    if (!showing || !element) return;
    const root = document.documentElement;
    const name = edge === "right" ? "--toast-area-right" : "--toast-sheet";
    const sync = () => {
      const size = edge === "right" ? element.offsetWidth : element.offsetHeight;
      root.style.setProperty(name, `${Math.round(size)}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(name);
    };
  }, [ref, edge, showing]);
}
