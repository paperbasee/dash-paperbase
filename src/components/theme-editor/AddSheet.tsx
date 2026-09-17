"use client";

import { Plus } from "lucide-react";

import { EditorSheet } from "./EditorSheet";

export type AddItem = {
  key: string;
  label: string;
  /** Why it cannot be added, shown under the name. */
  note?: string;
  disabled?: boolean;
};

/**
 * The list a merchant picks from when adding something: a section to a page, or a part to a
 * section. One sheet for both, because they are the same choice made twice — a named thing
 * out of the theme's list, with the ones the rules refuse listed but not offered.
 */
export function AddSheet({
  open,
  title,
  hint,
  items,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  hint: string;
  items: AddItem[];
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <EditorSheet open={open} title={title} hint={hint} onClose={onClose}>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              disabled={item.disabled === true}
              onClick={() => onPick(item.key)}
              className="flex min-h-12 w-full items-center gap-3 rounded-card border border-border px-3 py-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
            >
              <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{item.label}</span>
                {item.note ? <span className="block text-xs text-muted-foreground">{item.note}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </EditorSheet>
  );
}
