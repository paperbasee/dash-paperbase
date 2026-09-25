"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { CARD, CARD_ON, HELP, PILL, PILL_ON, PILLS } from "./styles";

export type KitOption = {
  value: string;
  label: ReactNode;
  /** What this answer does, said under the choice while it is the one chosen. */
  note?: ReactNode;
  /** A small drawing of the answer, for a choice drawn as cards. */
  mark?: ReactNode;
  /** A word beside the label: "Premium". */
  badge?: ReactNode;
  disabled?: boolean;
  /** Why it cannot be picked, for a pointer that rests on it. */
  title?: string;
};

/**
 * One answer out of a few (2026-09-26).
 *
 * **Three or fewer, and nothing to draw:** a pill bar -- the calmest control
 * there is, and a merchant reads all the answers at a glance. **More, or
 * answers that are shapes** (five header designs): small cards, two to a row,
 * each with its drawing. Either way the chosen answer's note is said once,
 * under the choice, rather than under every answer.
 */
export function KitChoice({
  label,
  options,
  value,
  onChange,
  help,
}: {
  label: string;
  options: KitOption[];
  value: string | undefined;
  onChange: (next: string) => void;
  help?: ReactNode;
}) {
  const chosen = options.find((option) => option.value === value);
  const cards = options.length > 3 || options.some((option) => option.mark);
  const note = chosen?.note ?? help;

  return (
    <div className="flex flex-col gap-2.5">
      {cards ? (
        <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
          {options.map((option) => {
            const on = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={option.disabled}
                title={option.title}
                onClick={() => onChange(option.value)}
                className={cn(CARD, on && CARD_ON)}
              >
                {option.mark ? <span aria-hidden>{option.mark}</span> : null}
                <span className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                  {option.label}
                  {option.badge}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div role="radiogroup" aria-label={label} className={PILLS}>
          {options.map((option) => {
            const on = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={option.disabled}
                title={option.title}
                onClick={() => onChange(option.value)}
                className={cn(PILL, on && PILL_ON)}
              >
                {option.label}
                {option.badge ? <span className="ml-1 align-middle">{option.badge}</span> : null}
              </button>
            );
          })}
        </div>
      )}
      {note ? <p className={HELP}>{note}</p> : null}
    </div>
  );
}

/** The small word a paid answer wears. */
export function KitBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[hsl(var(--accent-yellow)/0.16)] px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.05em] text-foreground/80">
      {children}
    </span>
  );
}
