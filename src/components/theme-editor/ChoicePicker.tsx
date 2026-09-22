"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { FieldOption } from "@/lib/theme-editor/field-specs";
import { cn } from "@/lib/utils";

/**
 * Ticking several of a theme's own choices: the shop's promises, four out of
 * sixteen.
 *
 * **The sister of `ProductPicker`, for a list the THEME holds.** That one
 * searches a shop's catalogue, which may run to thousands and cannot be listed;
 * these are sixteen fixed words that ship with the theme, so they are simply
 * all here, in the order the theme wrote them -- which groups them the way a
 * merchant thinks: getting it, paying for it, changing their mind.
 *
 * The order of the ticks is the order they will be drawn, so a merchant who
 * unticks one and ticks another finds the new one at the end rather than in the
 * gap. That is the same rule the featured band follows.
 *
 * Nothing is saved until Done: a merchant changing their mind twice should not
 * send two documents to the shop.
 */
export function ChoicePicker({
  open,
  options,
  value,
  most,
  onDone,
  onClose,
}: {
  open: boolean;
  /** Every choice the theme offers, already in the merchant's language. */
  options: FieldOption[];
  /** What is ticked now, in its own order. */
  value: string[];
  /** The most this place may hold, so the list can say when it is full. */
  most: number;
  onDone: (values: string[]) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor");
  const [ticked, setTicked] = useState<string[]>(value);

  // Each opening starts from what the place holds now: the sheet is one
  // component for the whole session, and ticks abandoned by a merchant who
  // closed it must not come back the next time they open it.
  useEffect(() => {
    if (open) setTicked(value);
    // `value` on purpose omitted: re-reading it while the sheet is open would
    // throw away ticks not yet pressed Done on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const full = ticked.length >= most;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="m-0 list-none space-y-1 p-0">
          {options.map((option) => {
            const chosen = ticked.includes(option.value);
            return (
              <li key={option.value}>
                <label
                  className={cn(
                    "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-card px-3 py-1.5",
                    "hover:bg-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-primary",
                    chosen && "bg-accent",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={chosen}
                    // Full means the ticked ones can still be UNticked and
                    // nothing else added -- a disabled row a merchant has
                    // ticked would trap them at four.
                    disabled={!chosen && full}
                    onChange={() =>
                      setTicked((current) =>
                        current.includes(option.value)
                          ? current.filter((one) => one !== option.value)
                          : full
                            ? current
                            : [...current, option.value],
                      )
                    }
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{option.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        The count says where the merchant stands against the cap before they
        press Done, rather than a refusal afterwards.
      */}
      <div className="flex items-center justify-between gap-3 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          {t("chosenCount", { count: ticked.length, max: most })}
        </p>
        <Button
          type="button"
          onClick={() => {
            onDone(ticked);
            onClose();
          }}
        >
          {t("chooseDone")}
        </Button>
      </div>
    </div>
  );
}
