"use client";

import { useTranslations } from "next-intl";
import { Clock, Trash2, Upload } from "lucide-react";

import { EditorSheet } from "./EditorSheet";

/**
 * Closing the editor with a draft waiting. The draft is safe either way, so this is not a warning
 * — it is the one question worth asking: does this go on the shop now, wait for later, or go?
 *
 * Each choice says what happens to the shop, because that is what the merchant is really deciding.
 * Closing the sheet keeps them in the editor, so there is always a way back out.
 */
export function CloseSheet({
  open,
  busy,
  onSave,
  onKeep,
  onDiscard,
  onClose,
}: {
  open: boolean;
  busy: boolean;
  onSave: () => void;
  onKeep: () => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor");

  const choices = [
    { key: "save", icon: Upload, label: t("saveToShop"), hint: t("leaveSaveHint"), onPick: onSave },
    { key: "keep", icon: Clock, label: t("leaveKeep"), hint: t("leaveKeepHint"), onPick: onKeep },
    {
      key: "discard",
      icon: Trash2,
      label: t("discardOpen"),
      hint: t("leaveDiscardHint"),
      onPick: onDiscard,
    },
  ];

  return (
    <EditorSheet open={open} title={t("leaveTitle")} hint={t("leaveHint")} onClose={onClose}>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {choices.map(({ key, icon: Icon, label, hint, onPick }) => (
          <li key={key}>
            <button
              type="button"
              disabled={busy}
              onClick={onPick}
              className="flex min-h-14 w-full items-start gap-3 rounded-card border border-border px-3 py-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </EditorSheet>
  );
}
