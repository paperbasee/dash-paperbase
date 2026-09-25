"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { HELP, LABEL, QUIET, ROUND, ROW } from "./styles";

/**
 * A setting that holds something chosen elsewhere -- a link, one product --
 * shown as what it holds, with Change. The whole row opens the picker; the ✕
 * empties it.
 */
export function KitValueRow({
  label,
  help,
  icon,
  value,
  empty,
  onPick,
  onClear,
  clearLabel,
}: {
  label: ReactNode;
  help?: ReactNode;
  icon: ReactNode;
  /** What it holds, in words a merchant reads; empty for nothing. */
  value: string;
  /** What to say when it holds nothing. */
  empty: string;
  onPick: () => void;
  onClear?: () => void;
  clearLabel?: string;
}) {
  const t = useTranslations("themeEditor.kit");
  return (
    <div className="flex flex-col gap-2">
      <p className={LABEL}>{label}</p>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onPick} className={cn(ROW, "flex-1")}>
          <span className="shrink-0 text-muted-foreground" aria-hidden>
            {icon}
          </span>
          <span className={cn("min-w-0 flex-1 truncate", value ? "text-foreground" : "text-muted-foreground")}>
            {value || empty}
          </span>
          <span className="shrink-0 text-[12.5px] font-medium text-muted-foreground">
            {value ? t("change") : t("choose")}
          </span>
        </button>
        {value && onClear ? (
          <button type="button" className={ROUND} aria-label={clearLabel} title={clearLabel} onClick={onClear}>
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {help ? <p className={HELP}>{help}</p> : null}
    </div>
  );
}

/**
 * A list ticked in a picker -- the featured products, the three departments,
 * the promises -- shown as how many, and what, with Edit.
 */
export function KitPicked({
  label,
  count,
  names,
  onEdit,
}: {
  label: ReactNode;
  /** "8 chosen", in the merchant's words. */
  count: string;
  /** The first few, named. */
  names: string[];
  onEdit: () => void;
}) {
  return (
    <button type="button" onClick={onEdit} className={ROW}>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-[13.5px] font-medium text-foreground">{label}</span>
          <span className="text-[12.5px] text-muted-foreground">{count}</span>
        </span>
        {names.length ? (
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{names.join(" · ")}</span>
        ) : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

/**
 * More, a tap away (2026-09-26: "Edit the words on the picture"). Folded by
 * default: the everyday settings are open and the rest waits here, in the same
 * view -- not a second pop-up, and nothing to go back from.
 */
export function KitFold({
  label,
  icon,
  defaultOpen = false,
  children,
}: {
  label: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-3.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={cn(QUIET, "-ml-2 self-start")}>
        {icon ?? null}
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? <div className="flex flex-col gap-5">{children}</div> : null}
    </div>
  );
}

/**
 * One part of a place -- a picture of the hero, a link of the menu, a question
 * -- as a calm row that opens to its own settings, with the moves and the
 * remove at its end.
 */
export function KitPart({
  title,
  summary,
  defaultOpen = false,
  onUp,
  onDown,
  onRemove,
  upLabel,
  downLabel,
  removeLabel,
  children,
}: {
  title: ReactNode;
  /** What it holds, when folded: its words, its link. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** Absent: this part cannot go that way. */
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  upLabel: string;
  downLabel: string;
  removeLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-card bg-muted/50">
      <div className="flex items-center gap-1 py-1 pl-1 pr-1.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-button px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-foreground">{title}</span>
            {!open && summary ? <span className="block truncate text-[12px] text-muted-foreground">{summary}</span> : null}
          </span>
        </button>
        <button type="button" className={ROUND} aria-label={upLabel} title={upLabel} disabled={!onUp} onClick={onUp}>
          <ArrowUp className="size-3.5" aria-hidden />
        </button>
        <button type="button" className={ROUND} aria-label={downLabel} title={downLabel} disabled={!onDown} onClick={onDown}>
          <ArrowDown className="size-3.5" aria-hidden />
        </button>
        <button type="button" className={ROUND} aria-label={removeLabel} title={removeLabel} onClick={onRemove}>
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
      {open ? <div className="flex flex-col gap-5 px-3.5 pb-4 pt-1">{children}</div> : null}
    </div>
  );
}

/** The button under a list that adds to it -- or the line that says it is full. */
export function KitAdd({ label, full, onAdd }: { label: ReactNode; full?: ReactNode; onAdd: () => void }) {
  if (full) return <p className={HELP}>{full}</p>;
  return (
    <button type="button" onClick={onAdd} className={cn(QUIET, "-ml-2 self-start")}>
      <span aria-hidden className="grid size-5 place-items-center rounded-button bg-muted text-[14px] leading-none">
        +
      </span>
      {label}
    </button>
  );
}
