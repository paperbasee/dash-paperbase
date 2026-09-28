"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Draws `children` at a fixed design width and scales the whole of it to fit, so a picture made
 * of real type and real boxes shrinks like an image instead of re-flowing.
 *
 * - `width`: the box takes its container's width, and its height follows the scaled content.
 * - `fill`: the box fills its container, which must have a height; the content is scaled to its
 *   width, from the top, and drawn exactly as tall as the box -- a child with `h-full` fills it.
 */
export function ScaleToFit({
  width,
  mode = "width",
  maxScale = 1,
  className,
  children,
}: {
  width: number;
  mode?: "width" | "fill";
  maxScale?: number;
  className?: string;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // `height`: the box's own height in `width` mode; the content's drawn height in `fill` mode.
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      if (mode === "fill") {
        const scale = Math.min(maxScale, outer.clientWidth / width);
        if (scale > 0) setFit({ scale, height: outer.clientHeight / scale });
        return;
      }
      const natural = inner.offsetHeight;
      if (!natural) return;
      const scale = Math.min(maxScale, outer.clientWidth / width);
      setFit({ scale, height: natural * scale });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [width, mode, maxScale]);

  return (
    <div
      ref={outerRef}
      className={cn("relative w-full", mode === "fill" && "h-full overflow-hidden", className)}
      style={mode === "width" && fit ? { height: fit.height } : undefined}
    >
      <div
        ref={innerRef}
        className="absolute left-1/2"
        style={{
          width,
          height: mode === "fill" && fit ? fit.height : undefined,
          marginLeft: -width / 2,
          top: 0,
          transformOrigin: "top center",
          transform: `scale(${fit?.scale ?? 1})`,
          visibility: fit ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
