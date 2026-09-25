"use client";

import type { ReactNode } from "react";
import { Check, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { FIELD, PILL, PILL_ON, PILLS } from "./styles";

/**
 * The pieces a picker is built from (2026-09-26): the picture, link, product
 * and list pickers the side panel opens -- tabs, a row to pick, a row to tick,
 * a search box -- in the same calm look as the panel itself.
 */

/** Tabs across the top of a picker: pages, categories, policies, the web. */
export function KitTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: { key: T; label: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className={PILLS}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(PILL, value === tab.key && PILL_ON)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** One answer in a list you pick ONE from: a page, a category. The picked one is ticked. */
export function KitPickRow({
  label,
  note,
  picked,
  onPick,
}: {
  label: ReactNode;
  note?: ReactNode;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={picked ? "true" : undefined}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-card px-3.5 py-2.5 text-left text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        picked ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-foreground">{label}</span>
        {note ? <span className="block text-[12px] text-muted-foreground">{note}</span> : null}
      </span>
      {picked ? <Check className="size-4 shrink-0 text-foreground" aria-hidden /> : null}
    </button>
  );
}

/** One answer in a list you tick SEVERAL from: a product, a department, a promise. */
export function KitTickRow({
  label,
  note,
  picture,
  checked,
  disabled,
  onToggle,
}: {
  label: ReactNode;
  note?: ReactNode;
  /** A small picture beside it: a product's. */
  picture?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-card px-3 py-2 transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-ring",
        checked ? "bg-muted" : "hover:bg-muted/60",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="size-4 shrink-0 accent-[hsl(var(--foreground))]"
      />
      {picture !== undefined ? (
        // eslint-disable-next-line @next/next/no-img-element -- a merchant upload on a
        // bucket the dashboard configures no loader for
        <img src={picture} alt="" className="size-10 shrink-0 rounded-xs bg-muted object-cover" />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] text-foreground">{label}</span>
        {note ? <span className="block truncate text-[12px] text-muted-foreground">{note}</span> : null}
      </span>
    </label>
  );
}

/** The search box at the top of a long list. */
export function KitSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(FIELD, "pl-9")}
      />
    </div>
  );
}

/** A picker's foot: where the merchant stands, and the one button that applies it. */
export function KitBar({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-center gap-3 border-t border-border px-5 py-3.5">{children}</div>;
}
