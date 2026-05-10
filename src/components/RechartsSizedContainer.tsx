"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type ChartSize = { width: number; height: number };

/** Measures the wrapper after layout; passes pixel size into children for Recharts `ResponsiveContainer`. */
export function RechartsSizedContainer({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: (size: ChartSize) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const width = Math.max(1, Math.floor(r.width));
      const height = Math.max(1, Math.floor(r.height));
      setSize((prev) =>
        prev && prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ width: "100%", ...style }}>
      {size ? children(size) : null}
    </div>
  );
}
