"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { SECTIONS, type SettingsSection } from "./settingsSections";
import { cn } from "@/lib/utils";

const DRAG_THRESHOLD_PX = 6;
const THUMB_MIN_PX = 24;

type ThumbGeom = { w: number; x: number };

function scrollThumbMetrics(el: HTMLDivElement, track: HTMLDivElement) {
  const overflow = el.scrollWidth - el.clientWidth;
  if (overflow <= 1) return null;
  const tw = track.clientWidth;
  if (tw <= 0) return null;
  const thumbW = Math.max(THUMB_MIN_PX, (el.clientWidth / el.scrollWidth) * tw);
  const maxX = Math.max(0, tw - thumbW);
  return { overflow, maxX, thumbW };
}

function computeThumbGeom(
  el: HTMLDivElement,
  track: HTMLDivElement
): ThumbGeom | null {
  const m = scrollThumbMetrics(el, track);
  if (!m) return null;
  const x = m.maxX > 0 ? (el.scrollLeft / m.overflow) * m.maxX : 0;
  return { w: m.thumbW, x };
}

export function SettingsSectionNav({
  activeSection,
  onSelect,
  onNavigate,
  className,
  variant = "vertical",
}: {
  activeSection: SettingsSection;
  onSelect: (id: SettingsSection) => void;
  onNavigate?: () => void;
  className?: string;
  variant?: "vertical" | "horizontal";
}) {
  const t = useTranslations("settings");
  return (
    <nav
      className={cn(
        variant === "vertical" ? "flex flex-col gap-0.5" : "flex flex-row flex-nowrap gap-2",
        className
      )}
      role="tablist"
      aria-label={t("navAria")}
    >
      {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeSection === id}
          aria-controls={`panel-${id}`}
          id={`tab-${id}`}
          onClick={() => {
            onSelect(id);
            onNavigate?.();
          }}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-colors shrink-0",
            variant === "vertical" && "rounded-card px-3 py-2.5 text-left",
            variant === "horizontal" && "rounded-none border px-4 py-2.5 text-center text-sm whitespace-nowrap",
            variant === "vertical" &&
              (activeSection === id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"),
            variant === "horizontal" &&
              (activeSection === id
                ? "border-border bg-foreground text-background"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground")
          )}
        >
          <Icon className="size-4 shrink-0" />
          {t(labelKey)}
        </button>
      ))}
    </nav>
  );
}

export const SettingsDesktopSectionNav = forwardRef<
  HTMLDivElement,
  {
    activeSection: SettingsSection;
    onSelect: (id: SettingsSection) => void;
  }
>(function SettingsDesktopSectionNav({ activeSection, onSelect }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [thumb, setThumb] = useState<ThumbGeom>({ w: 0, x: 0 });

  const dragPointerId = useRef<number | null>(null);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const dragCommitted = useRef(false);

  const thumbDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startScrollLeft: number;
  } | null>(null);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  const updateScrollable = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollable(el.scrollWidth > el.clientWidth + 1);
  }, []);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const g = computeThumbGeom(el, track);
    if (g) setThumb(g);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const syncLayout = () => {
      updateScrollable();
      requestAnimationFrame(updateThumb);
    };

    syncLayout();

    const ro = new ResizeObserver(syncLayout);
    ro.observe(el);
    const child = el.firstElementChild;
    if (child) ro.observe(child);

    const track = trackRef.current;
    if (track) ro.observe(track);

    const onScroll = () => updateThumb();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", syncLayout);

    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", syncLayout);
    };
  }, [activeSection, scrollable, updateScrollable, updateThumb]);

  const endDrag = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (el && dragPointerId.current === ev.pointerId) {
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch {
          /* not captured */
        }
      }
      dragPointerId.current = null;
      setDragging(false);

      if (dragCommitted.current && el) {
        const blockNextClick = (clickEv: MouseEvent) => {
          if (!el.contains(clickEv.target as Node)) return;
          clickEv.preventDefault();
          clickEv.stopPropagation();
        };
        document.addEventListener("click", blockNextClick, {
          capture: true,
          once: true,
        });
      }
      dragCommitted.current = false;
    },
    []
  );

  const onPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (ev.button !== 0) return;
      const el = scrollRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;

      dragPointerId.current = ev.pointerId;
      dragStartX.current = ev.clientX;
      dragStartScrollLeft.current = el.scrollLeft;
      dragCommitted.current = false;
    },
    []
  );

  const onPointerMove = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || dragPointerId.current !== ev.pointerId) return;

    const dx = ev.clientX - dragStartX.current;
    if (!dragCommitted.current && Math.abs(dx) >= DRAG_THRESHOLD_PX) {
      dragCommitted.current = true;
      setDragging(true);
      try {
        el.setPointerCapture(ev.pointerId);
      } catch {
        /* already captured or unsupported */
      }
    }
    if (dragCommitted.current) {
      el.scrollLeft = dragStartScrollLeft.current - dx;
      ev.preventDefault();
    }
  }, []);

  const endTabStripPointer = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (dragPointerId.current === ev.pointerId) {
        endDrag(ev);
      }
    },
    [endDrag]
  );

  const onTrackPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (ev.button !== 0) return;
      if (ev.target !== ev.currentTarget) return;
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const m = scrollThumbMetrics(el, track);
      if (!m || m.maxX <= 0) return;

      const rect = track.getBoundingClientRect();
      const clickX = ev.clientX - rect.left - m.thumbW / 2;
      const x = Math.max(0, Math.min(m.maxX, clickX));
      el.scrollLeft = (x / m.maxX) * m.overflow;
      requestAnimationFrame(updateThumb);
    },
    [updateThumb]
  );

  const onThumbPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      ev.stopPropagation();
      if (ev.button !== 0) return;
      const el = scrollRef.current;
      if (!el) return;
      thumbDragRef.current = {
        pointerId: ev.pointerId,
        startClientX: ev.clientX,
        startScrollLeft: el.scrollLeft,
      };
      try {
        ev.currentTarget.setPointerCapture(ev.pointerId);
      } catch {
        /* noop */
      }
    },
    []
  );

  const onThumbPointerMove = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    const d = thumbDragRef.current;
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!d || !el || !track || ev.pointerId !== d.pointerId) return;

    const m = scrollThumbMetrics(el, track);
    if (!m || m.maxX <= 0) return;
    const dx = ev.clientX - d.startClientX;
    const next =
      d.startScrollLeft + (dx / m.maxX) * m.overflow;
    el.scrollLeft = Math.max(0, Math.min(m.overflow, next));
  }, []);

  const onThumbPointerEnd = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    const d = thumbDragRef.current;
    if (!d || ev.pointerId !== d.pointerId) return;
    thumbDragRef.current = null;
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col">
      <div
        ref={setRefs}
        className={cn(
          "scrollbar-hide w-full max-w-full min-w-0 overflow-x-auto touch-pan-x",
          scrollable && "cursor-grab",
          dragging && "cursor-grabbing select-none"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endTabStripPointer}
        onPointerCancel={endTabStripPointer}
      >
        <SettingsSectionNav
          activeSection={activeSection}
          onSelect={onSelect}
          variant="horizontal"
          className="w-max min-w-max"
        />
      </div>
      {scrollable ? (
        <div
          ref={trackRef}
          className="settings-tabs-hscroll-bar"
          onPointerDown={onTrackPointerDown}
        >
          <div
            className="settings-tabs-hscroll-bar__thumb"
            style={{ width: thumb.w, left: thumb.x }}
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerEnd}
            onPointerCancel={onThumbPointerEnd}
          />
        </div>
      ) : null}
    </div>
  );
});

SettingsDesktopSectionNav.displayName = "SettingsDesktopSectionNav";
