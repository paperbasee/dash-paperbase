"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell: border, background, horizontal padding for every settings tab panel. */
export const settingsSectionSurfaceClassName =
  "rounded-card border border-dashed border-border bg-background p-4 md:p-6";

/** Filled controls on settings: dark in light mode, light in dark mode (foreground on background). */
export const settingsInvertedButtonClassName =
  "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background";

/** Inner column follows the page-level settings container width. */
export const settingsSectionBodyClassName = "w-full";

type SettingsSectionBodyProps = {
  children: ReactNode;
  /** Vertical gap between direct children (title block, main content, etc.) */
  gap?: "default" | "compact";
  className?: string;
};

export function SettingsSectionBody({
  children,
  gap = "default",
  className,
}: SettingsSectionBodyProps) {
  return (
    <div
      className={cn(
        settingsSectionBodyClassName,
        gap === "default" ? "space-y-6" : "space-y-4",
        className
      )}
    >
      {children}
    </div>
  );
}
