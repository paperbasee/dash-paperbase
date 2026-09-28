"use client";

import { useEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Toaster } from "sonner";

/**
 * How far the notes rise from the bottom of the screen: past the phone's keyboard, or the theme
 * editor's settings sheet, whichever is taller -- see `useToastArea`.
 */
const LIFT = "max(var(--toast-keyboard, 0px), var(--toast-sheet, 0px))";

/**
 * Where the pop-up notes appear (owner, 2026-09-29): at the bottom, centred in the area being
 * worked in -- the page beside the sidebar, or the shop preview beside the theme editor's settings
 * panel -- and full width at the bottom of a phone. The centring is `globals.css`'s, which reads the
 * area from `--toast-area-left` / `--toast-area-right`; the library alone would centre on the whole
 * window, sidebar and all.
 */
export function NotificationViewport() {
  const tCommon = useTranslations("common");

  // The phone keyboard covers the bottom of the screen without moving what is fixed there, so a
  // note would sit behind it. The visual viewport says how much it covers; a pinch-zoom changes
  // that too, and is not a keyboard.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const sync = () => {
      const covered = Math.abs(viewport.scale - 1) > 0.01
        ? 0
        : Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      root.style.setProperty("--toast-keyboard", `${Math.round(covered)}px`);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      root.style.removeProperty("--toast-keyboard");
    };
  }, []);

  return (
    <Toaster
      position="bottom-center"
      closeButton={false}
      expand
      visibleToasts={3}
      gap={8}
      offset={{ bottom: `calc(${LIFT} + 24px)` }}
      mobileOffset={{ bottom: `calc(${LIFT} + 12px)`, left: "12px", right: "12px" }}
      // Read out by a screen reader, so it belongs in the merchant's language too.
      containerAriaLabel={tCommon("toastRegionLabel")}
      style={{ zIndex: 70, "--width": "22rem" } as CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          // The note's own width on a computer; on a phone the library sets it to the screen's.
          toast: "w-(--width)",
        },
      }}
    />
  );
}
