"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ZoneBlockProps = {
  zone: string;
  activeZones: Set<string>;
  label: string;
  children: ReactNode;
  className?: string;
};

export function ZoneBlock({
  zone,
  activeZones,
  label,
  children,
  className,
}: ZoneBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prevActive = useRef(false);
  const isActive = activeZones.has(zone);

  useEffect(() => {
    if (isActive && !prevActive.current && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    prevActive.current = isActive;
  }, [isActive]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-card border transition-all duration-300",
        isActive
          ? "scale-[1.02] border-primary/40 bg-primary/10 shadow-md ring-2 ring-primary/30"
          : "border-border/50 bg-muted/20",
        className,
      )}
    >
      {isActive && (
        <span className="absolute top-2 left-2 z-10 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase shadow-sm">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
