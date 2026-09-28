"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

export const CODE_LENGTH = 6;

/**
 * Six boxes for the code from the email (2026-09-29), in the manner of Stripe's and Shopify's: one
 * real input lies over them, unseen, so typing, pasting a whole code, the phone offering the code
 * from its mail (`one-time-code`) and Backspace all work as they do in any box; the boxes only
 * draw it. Full, it calls `onComplete` -- nothing to press.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  label,
  invalid = false,
  shakeKey = 0,
  busy = false,
  disabled = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete: (code: string) => void;
  /** Said by a screen reader: the boxes carry no words. */
  label: string;
  invalid?: boolean;
  /** A new value shakes the boxes again: one per wrong code. */
  shakeKey?: number;
  /** While a code is being checked: nothing more can be typed, but the box keeps the focus. */
  busy?: boolean;
  /** No more tries: a new code has to be sent. */
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, CODE_LENGTH - 1);

  function take(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(digits);
    if (digits.length === CODE_LENGTH) onComplete(digits);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={CODE_LENGTH}
        aria-label={label}
        aria-invalid={invalid}
        autoFocus={autoFocus}
        disabled={disabled}
        readOnly={busy}
        value={value}
        onChange={(e) => take(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // The caret always sits after the last digit, so Backspace takes the last one off.
        onSelect={(e) => {
          const end = e.currentTarget.value.length;
          e.currentTarget.setSelectionRange(end, end);
        }}
        className="absolute inset-0 z-10 size-full cursor-text opacity-0 disabled:cursor-default"
      />
      <div key={shakeKey} className={cn("flex items-center gap-2 sm:gap-2.5", invalid && "pb-shake")} aria-hidden>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const digit = value[i] ?? "";
          const isActive = focused && !disabled && i === active && value.length < CODE_LENGTH;
          return (
            <div key={i} className="contents">
              {i === CODE_LENGTH / 2 ? <span className="h-px w-3 shrink-0 bg-border-hover" /> : null}
              <span
                className={cn(
                  "flex h-14 min-w-0 flex-1 items-center justify-center rounded-ui border bg-background text-[22px] font-semibold tabular-nums text-foreground transition-[border-color,box-shadow] duration-150",
                  invalid
                    ? "border-destructive/70"
                    : isActive
                      ? "border-foreground shadow-[0_0_0_4px_hsl(var(--foreground)/0.08)]"
                      : digit
                        ? "border-border-hover"
                        : "border-border",
                  disabled && "opacity-60"
                )}
              >
                {digit ? (
                  <span className="pb-pop">{digit}</span>
                ) : isActive ? (
                  <span className="pb-caret h-6 w-px bg-foreground" />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
