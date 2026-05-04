"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const OVERFLOW_EPS = 8;
const NEAR_BOTTOM_EPS = 12;

function readMetrics() {
  const root = document.documentElement;
  const scrollTop = root.scrollTop;
  const clientHeight = window.innerHeight;
  const scrollHeight = root.scrollHeight;
  return { scrollTop, clientHeight, scrollHeight };
}

/**
 * Fixed circular control with Lucide down-arrow when the document extends below the viewport.
 * Click scrolls smoothly by ~one screen.
 */
export function BelowFoldScrollHint({ className }: { className?: string }) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);

  const sync = useCallback(() => {
    const { scrollTop, clientHeight, scrollHeight } = readMetrics();
    const hasMoreBelow =
      scrollHeight > clientHeight + OVERFLOW_EPS &&
      scrollTop + clientHeight < scrollHeight - NEAR_BOTTOM_EPS;
    setVisible(hasMoreBelow);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const ro = new ResizeObserver(sync);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro.disconnect();
    };
  }, [sync]);

  const onClick = () => {
    window.scrollBy({ top: Math.max(120, window.innerHeight * 0.72), behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-1/2 z-[35] -translate-x-1/2",
        className
      )}
      style={{
        bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={t("scrollMoreBelow")}
        className={cn(
          "pointer-events-auto flex size-11 items-center justify-center rounded-full",
          "border border-border/45 text-muted-foreground",
          "bg-background/30 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-2xl backdrop-saturate-[1.35]",
          "dark:border-white/12 dark:bg-background/20 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          "transition-[color,background-color,box-shadow,border-color,backdrop-filter] duration-200",
          "hover:border-border/65 hover:bg-background/42 hover:text-foreground hover:backdrop-blur-3xl hover:shadow-xl",
          "dark:hover:border-white/18 dark:hover:bg-background/32",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <ArrowDown className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
