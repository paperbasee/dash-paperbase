"use client";

import { useRef, useState } from "react";
import { StickyNote, Trash2, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Popover, Tooltip } from "radix-ui";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  ORDER_NOTE_MAX_LENGTH,
  type OrderNote,
  isOrderNoteChanged,
  orderNoteCharactersLeft,
  saveOrderNote,
} from "@/lib/orders/order-note";
import { cn } from "@/lib/utils";
import { notify } from "@/notifications";
import type { Order } from "@/types";

/** Under this the note opens as a sheet from the bottom, where a keyboard cannot hide it. */
const PHONE_QUERY = "(max-width: 767px)";

const FLOATING_CARD =
  "z-50 rounded-popover border border-border-subtle bg-popover text-popover-foreground [box-shadow:var(--shadow-popover)]";

type OrderNoteButtonProps = {
  order: Pick<
    Order,
    | "public_id"
    | "order_number"
    | "merchant_note"
    | "merchant_note_updated_at"
    | "merchant_note_updated_by"
  >;
  onSaved: (note: OrderNote) => void;
  className?: string;
};

/**
 * The team's one note on an order: a small icon that is faint while there is no note and
 * solid once there is, showing the note when pointed at and opening it when clicked.
 */
export function OrderNoteButton({ order, onSaved, className }: OrderNoteButtonProps) {
  const t = useTranslations("orderNote");
  const format = useFormatter();
  const note = order.merchant_note ?? "";
  const hasNote = note.length > 0;
  const orderNumber = order.order_number;

  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState<"card" | "sheet">("card");
  const [draft, setDraft] = useState(note);
  const [nudged, setNudged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [peeking, setPeeking] = useState(false);
  // Esc means leave without saving, so the guard on unsaved words stands aside for it.
  const leaving = useRef(false);
  // Focus comes back to the icon when the note closes, which is not someone pointing at it.
  const skipPeek = useRef(false);

  const changed = isOrderNoteChanged(draft, order.merchant_note);
  const left = orderNoteCharactersLeft(draft);
  const whoAndWhen =
    hasNote && order.merchant_note_updated_at
      ? t("by", {
          name: order.merchant_note_updated_by ?? "",
          when: format.relativeTime(new Date(order.merchant_note_updated_at), new Date()),
        })
      : "";

  function show() {
    setDraft(note);
    setNudged(false);
    setPeeking(false);
    setSurface(window.matchMedia(PHONE_QUERY).matches ? "sheet" : "card");
    setOpen(true);
  }

  function close() {
    skipPeek.current = true;
    leaving.current = false;
    setNudged(false);
    setOpen(false);
  }

  function requestClose() {
    if (changed && !leaving.current) {
      setNudged(true);
      return;
    }
    close();
  }

  function handleOpenChange(next: boolean) {
    if (next) show();
    else requestClose();
  }

  async function persist(text: string): Promise<boolean> {
    setSaving(true);
    try {
      onSaved(await saveOrderNote(order.public_id, text));
      close();
      return true;
    } catch (error) {
      notify.error(error, { title: t("notSaved"), fallbackMessage: t("tryAgain") });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (await persist(draft)) notify.success(draft.trim() ? t("saved") : t("removed"));
  }

  async function handleRemove() {
    const previous = note;
    if (!(await persist(""))) return;
    notify.success(t("removed"), {
      // Long enough to read it and change your mind.
      durationMs: 8000,
      action: {
        label: t("undo"),
        onClick: () => {
          saveOrderNote(order.public_id, previous)
            .then(onSaved)
            .catch((error) => {
              notify.error(error, { title: t("notSaved"), fallbackMessage: t("tryAgain") });
            });
        },
      },
    });
  }

  const form = (
    <>
      <Textarea
        autoFocus
        value={draft}
        maxLength={ORDER_NOTE_MAX_LENGTH}
        placeholder={t("placeholder")}
        aria-label={t("label", { orderNumber })}
        className="max-h-56 min-h-28 resize-none bg-input-surface text-base leading-relaxed md:text-sm"
        onFocus={(event) => {
          // Reopened to add to it: the caret goes after the words, not before them.
          const end = event.target.value.length;
          event.target.setSelectionRange(end, end);
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          setNudged(false);
        }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && changed && !saving) {
            event.preventDefault();
            void handleSave();
          }
        }}
      />
      <div className="mt-2.5 flex min-h-9 items-center gap-2">
        <p
          className={cn(
            "min-w-0 flex-1 text-xs leading-snug text-muted-foreground",
            nudged && changed && "font-medium text-amber-700 dark:text-amber-400"
          )}
        >
          {nudged && changed ? t("unsaved") : whoAndWhen || t("teamOnly")}
        </p>
        {hasNote ? (
          <button
            type="button"
            aria-label={t("remove")}
            disabled={saving}
            onClick={() => void handleRemove()}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-ui text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:hover:bg-rose-500/20 dark:hover:text-rose-200 md:size-8"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={!changed || saving}
          onClick={() => void handleSave()}
          className={cn("shrink-0", nudged && changed && "ring-2 ring-amber-500/50")}
        >
          {t("save")}
        </Button>
      </div>
    </>
  );

  const heading = (Title: "h2" | typeof SheetTitle) => (
    <div className="mb-2.5 flex items-center gap-2">
      <Title className="text-sm font-semibold text-foreground">{t("title")}</Title>
      <span className="text-xs text-muted-foreground tabular-nums">#{orderNumber}</span>
      {left !== null ? (
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {t("left", { count: left })}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={t("close")}
        onClick={requestClose}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-ui text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          left === null && "ml-auto"
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );

  return (
    // Everything here sits inside a clickable order row, and React carries clicks and keys
    // out of the pop-ups through it: stopped once, here, so none of them opens the order.
    <span
      className="contents"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Popover.Root open={open && surface === "card"} onOpenChange={handleOpenChange}>
        <Tooltip.Root
          delayDuration={120}
          open={hasNote && peeking && !open}
          onOpenChange={(next) => {
            if (next && skipPeek.current) {
              skipPeek.current = false;
              return;
            }
            setPeeking(next);
          }}
        >
          <Tooltip.Trigger asChild>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label={
                  hasNote ? t("read", { orderNumber }) : t("add", { orderNumber })
                }
                onPointerEnter={() => {
                  skipPeek.current = false;
                }}
                onClick={() => {
                  // Popover.Trigger opens the card; a phone gets the sheet from `show`.
                  if (open && surface === "sheet") requestClose();
                }}
                className={cn(
                  "inline-flex size-10 shrink-0 items-center justify-center rounded-ui transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring md:size-7",
                  hasNote
                    ? "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                    : "text-muted-foreground/60 hover:bg-muted hover:text-foreground",
                  open && "bg-muted",
                  className
                )}
              >
                <StickyNote
                  className={cn("size-4", hasNote && "fill-amber-400/25")}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
            </Popover.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              align="center"
              sideOffset={6}
              collisionPadding={12}
              className={cn(FLOATING_CARD, "w-72 max-w-[calc(100vw-1.5rem)] px-3 py-2.5")}
            >
              <p className="line-clamp-3 text-sm leading-normal whitespace-pre-wrap">{note}</p>
              {whoAndWhen ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{whoAndWhen}</p>
              ) : null}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            onEscapeKeyDown={() => {
              leaving.current = true;
            }}
            className={cn(
              FLOATING_CARD,
              "w-[22rem] max-w-[calc(100vw-2rem)] p-3.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            )}
          >
            {heading("h2")}
            {form}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Sheet open={open && surface === "sheet"} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          onEscapeKeyDown={() => {
            leaving.current = true;
          }}
          className="gap-0 rounded-t-xl px-4 pt-3 pb-5"
        >
          {heading(SheetTitle)}
          {form}
        </SheetContent>
      </Sheet>
    </span>
  );
}
