"use client";

import { useTranslations } from "next-intl";
import { History, MoreVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The two whole-theme things that are not Save: the saves this shop can go back to, and throwing
 * the draft away. They sit behind one button so the top bar keeps Close, the status and Save at
 * a size a thumb can hit on a phone.
 */
export function EditorMenu({
  hasDraft,
  busy,
  onHistory,
  onDiscard,
}: {
  /** Nothing to discard without one. */
  hasDraft: boolean;
  busy: boolean;
  onHistory: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("themeEditor");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 md:size-9"
          aria-label={t("menuLabel")}
          title={t("menuLabel")}
          disabled={busy}
        >
          <MoreVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onHistory}>
          <History className="size-4" aria-hidden />
          {t("historyOpen")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!hasDraft} variant="destructive" onSelect={onDiscard}>
          <Trash2 className="size-4" aria-hidden />
          {t("discardOpen")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
