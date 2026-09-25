"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { FieldOption } from "@/lib/theme-editor/field-specs";
import { KitBar, KitTickRow } from "./kit";
import { HELP, PRIMARY } from "./kit/styles";

/**
 * Ticking several choices off a list short enough to show: the shop's sixteen
 * promises, four at a time; its own departments, three at a time.
 *
 * **The sister of `ProductPicker`.** That one searches a catalogue, which may
 * run to thousands and cannot be listed; these lists are tens of things, so
 * they are simply all here, in the order they were given -- which for the
 * promises is how a merchant thinks about them (getting it, paying for it,
 * changing their mind) and for departments is the merchant's own arrangement.
 *
 * An option may carry a `note` -- "No products" beside an empty department --
 * and it never stops the tick: a merchant setting a shop up picks the aisle
 * they are about to fill.
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
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {options.map((option) => {
            const chosen = ticked.includes(option.value);
            return (
              <li key={option.value}>
                <KitTickRow
                  label={option.label}
                  note={option.note}
                  checked={chosen}
                  disabled={!chosen && full}
                  onToggle={() =>
                    setTicked((current) =>
                      current.includes(option.value)
                        ? current.filter((one) => one !== option.value)
                        : full
                          ? current
                          : [...current, option.value],
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        The count says where the merchant stands against the cap before they
        press Done, rather than a refusal afterwards.
      */}
      <KitBar>
        <p className={HELP}>{t("chosenCount", { count: ticked.length, max: most })}</p>
        <button
          type="button"
          className={`${PRIMARY} ml-auto`}
          onClick={() => {
            onDone(ticked);
            onClose();
          }}
        >
          {t("chooseDone")}
        </button>
      </KitBar>
    </>
  );
}
