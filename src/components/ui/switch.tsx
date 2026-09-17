"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.ComponentProps<"button">, "onChange" | "type"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * An on/off control. A plain button with `role="switch"`, the way DynamicFieldsPanel draws
 * its own: a checkbox styled into a track cannot show the knob sliding, and this needs no
 * new dependency.
 *
 * The hit area is 44px tall so a thumb finds it; the track inside is the small part that is
 * painted.
 */
function Switch({ checked, onCheckedChange, className, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-slot="switch"
      className={cn(
        "inline-flex h-11 shrink-0 items-center rounded-ui px-0.5 outline-none md:h-9",
        "focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 rounded-full border border-input-border transition-colors duration-150",
          checked ? "bg-foreground" : "bg-input-surface",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-[15px] -translate-y-1/2 rounded-full bg-background shadow-sm transition-[left] duration-150",
            checked ? "left-[17px]" : "left-[2px]",
          )}
        />
      </span>
    </button>
  );
}

export { Switch };
