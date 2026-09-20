"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  isEmpty,
  SLOTS,
  type OptionShape,
  type Slot,
  type SlotOption,
  type SlotPageKey,
} from "@/lib/theme-editor/slot-catalogue";
import { ShopChrome } from "./ShopChrome";

/**
 * The page IS the editor.
 *
 * There is no list beside the canvas: a merchant clicks the thing they want to
 * change, where it sits, and the choices open underneath it. That is the whole
 * interaction, and it is why the shop is drawn as a shop rather than as grey
 * bars -- you cannot click the thing you want if you cannot recognise it.
 *
 * Three kinds of place, told apart before the click rather than after it:
 *
 *   a place you fill      a tab in the accent, and choices when clicked
 *   a place that is set   a tab with a lock; clicking says WHY, which is not
 *                         the same as doing nothing
 *   a place from elsewhere the header and footer, drawn here so the page reads
 *                         whole, edited once from the page picker
 *
 * An empty place draws itself as empty rather than collapsing, because a slot a
 * merchant cannot see is a slot they will never fill.
 */

/** The little wireframe on an option's tile: the shape it makes, not a picture of it. */
function OptionShapeMark({ shape }: { shape: OptionShape }) {
  if (shape === "blank") {
    return <span className="block h-10 rounded-xs bg-muted" aria-hidden />;
  }
  if (shape === "block") {
    return <span className="block h-10 rounded-xs bg-muted-foreground/20" aria-hidden />;
  }
  if (shape === "row") {
    return (
      <span className="flex h-10 gap-1 rounded-xs bg-muted p-1.5" aria-hidden>
        <span className="flex-1 rounded-[2px] bg-muted-foreground/20" />
        <span className="flex-1 rounded-[2px] bg-muted-foreground/20" />
      </span>
    );
  }
  return (
    <span className="flex h-10 flex-col justify-center gap-1 rounded-xs bg-muted px-1.5" aria-hidden>
      <span className="h-1 rounded-full bg-muted-foreground/25" />
      <span className="h-1 rounded-full bg-muted-foreground/25" />
      <span className="h-1 w-1/2 rounded-full bg-muted-foreground/25" />
    </span>
  );
}

function OptionTile({
  option,
  chosen,
  onPick,
}: {
  option: SlotOption;
  chosen: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={(event) => {
        event.stopPropagation();
        onPick();
      }}
      className={cn(
        "flex flex-col gap-2 rounded-sm border p-2.5 text-left transition-colors",
        "hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        chosen ? "border-primary ring-1 ring-inset ring-primary" : "border-border-subtle",
      )}
    >
      <OptionShapeMark shape={option.shape} />
      <span className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
        {t(option.label)}
        {option.premium ? (
          <span className="accent-yellow rounded-[4px] bg-[hsl(var(--accent-yellow)/0.14)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em]">
            {t("premium")}
          </span>
        ) : null}
      </span>
      {option.note ? <span className="text-[11px] text-muted-foreground">{t(option.note)}</span> : null}
    </button>
  );
}

/** The choices, opened in place under the slot they belong to. */
function Chooser({
  slot,
  value,
  onPick,
  onDone,
}: {
  slot: Slot;
  value: string | undefined;
  onPick: (next: string) => void;
  onDone: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  return (
    <div
      className="border-t border-border bg-card p-3 text-card-foreground"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <strong className="text-[13px] font-semibold">
          {slot.locked ? t("thisOneIsSet") : t("whatGoesHere")}
        </strong>
        <span className="text-xs text-muted-foreground">{t(slot.label)}</span>
        <button
          type="button"
          onClick={onDone}
          className="ml-auto rounded-xs px-1 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {t("done")}
        </button>
      </div>

      {slot.locked ? (
        <p className="m-0 max-w-prose text-[13px] text-muted-foreground">{t(slot.lockedBecause ?? "lockedWhy")}</p>
      ) : (
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(126px,1fr))]">
          {slot.options?.map((option) => (
            <OptionTile
              key={option.value}
              option={option}
              chosen={value === option.value}
              onPick={() => onPick(option.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SlotCanvas({
  page,
  device,
  open,
  onOpen,
  choices,
  onChoose,
}: {
  page: SlotPageKey;
  device: "desktop" | "mobile";
  open: string | null;
  onOpen: (slotKey: string | null) => void;
  choices: Record<string, string>;
  onChoose: (slotKey: string, value: string) => void;
}) {
  const t = useTranslations("themeEditor.slots");

  return (
    <div className="flex justify-center bg-muted/40 p-1.5 sm:p-2">
      <div
        className={cn(
          "w-full overflow-hidden rounded-sm border border-border-subtle bg-background text-foreground transition-[max-width]",
          device === "mobile" ? "max-w-[320px]" : "max-w-none",
        )}
      >
        {SLOTS[page].map((slot) => {
          const isOpen = open === slot.key;
          const value = choices[slot.key];
          const pickable = !slot.inherited;
          const blank = isEmpty(slot, value);

          return (
            <div
              key={slot.key}
              {...(pickable
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-expanded": isOpen,
                    onClick: () => onOpen(isOpen ? null : slot.key),
                    onKeyDown: (event: React.KeyboardEvent) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onOpen(isOpen ? null : slot.key);
                    },
                  }
                : {})}
              className={cn(
                "group relative border-2 border-transparent outline-none",
                pickable && "cursor-pointer",
                pickable && !slot.locked && "hover:border-primary hover:bg-primary/5",
                slot.locked && "hover:border-border-hover hover:bg-muted/50",
                isOpen && !slot.locked && "border-primary bg-primary/5",
                isOpen && slot.locked && "border-border-hover bg-muted/50",
                "focus-visible:border-primary",
              )}
            >
              {/* The tab that names the place, and says what kind it is. */}
              <span
                className={cn(
                  "pointer-events-none absolute -left-px -top-px z-10 inline-flex items-center gap-1 rounded-br-sm px-1.5 py-1",
                  "text-[10px] font-medium tracking-[0.02em] text-white opacity-0 transition-opacity",
                  "group-hover:opacity-100",
                  isOpen && "opacity-100",
                  slot.inherited || slot.locked ? "bg-muted-foreground" : "bg-primary",
                )}
              >
                {slot.locked ? <Lock className="size-2.5" aria-hidden /> : null}
                {t(slot.label)}
                {slot.inherited ? ` · ${t("everyPage")}` : null}
              </span>

              {blank ? (
                <div
                  className="grid place-items-center py-6 text-center"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(135deg, transparent, transparent 8px, var(--color-border-subtle) 8px, var(--color-border-subtle) 9px)",
                  }}
                >
                  <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">
                    {t(slot.emptyLabel ?? "nothingHere")}
                  </span>
                </div>
              ) : (
                <ShopChrome page={page} slotKey={slot.key} variant={value} />
              )}

              {isOpen ? (
                <Chooser
                  slot={slot}
                  value={value}
                  onPick={(next) => onChoose(slot.key, next)}
                  onDone={() => onOpen(null)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
