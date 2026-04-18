import { useCallback, useEffect, useState } from "react";

type Options = {
  enabled?: boolean;
};

/**
 * Converts vertical mouse-wheel delta into horizontal scroll inside the
 * returned container ref when it has horizontal overflow.
 *
 * Returns a callback ref — attach it as `ref={setNode}` on the scroll
 * container. A callback ref is used (instead of accepting a `RefObject`)
 * so the effect re-runs when the element actually mounts/unmounts, which
 * matters for conditionally rendered containers (e.g. behind a loading
 * branch).
 *
 * Uses a native `wheel` listener with `{ passive: false }` because React's
 * synthetic `onWheel` is passive and cannot call `preventDefault`.
 *
 * At the horizontal edges, the vertical wheel is released back to the page
 * (no `preventDefault`) so normal page scrolling resumes naturally.
 */
export function useHorizontalWheelScroll<T extends HTMLElement>(
  options?: Options,
): (node: T | null) => void {
  const enabled = options?.enabled ?? true;
  const [el, setEl] = useState<T | null>(null);

  const setNode = useCallback((node: T | null) => {
    setEl(node);
  }, []);

  useEffect(() => {
    if (!enabled || !el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;

      if (el.scrollWidth <= el.clientWidth) return;

      const absY = Math.abs(e.deltaY);
      const absX = Math.abs(e.deltaX);
      if (absY === 0 || absX >= absY) return;

      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        delta *= 16;
      } else if (e.deltaMode === 2) {
        delta *= el.clientWidth;
      }

      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= maxScrollLeft;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;

      e.preventDefault();
      el.scrollLeft += delta;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [el, enabled]);

  return setNode;
}
