"use client";

import { CircleAlert, CircleCheck, Info, Trash2, TriangleAlert, Undo2, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info" | "default";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastIconName =
  | "success"
  | "information"
  | "warning"
  | "error"
  | "notice"
  | "server-error"
  | "trash"
  | "undo";

type ToastProps = {
  variant: ToastVariant;
  message: string;
  title?: string;
  action?: ToastAction;
  iconName?: ToastIconName;
  onClose?: () => void;
  /** The details were opened: keep the note until it is closed. */
  onExpand?: () => void;
};

/**
 * One thin-line icon per kind, in the colour that says how it went. The words carry the rest:
 * no coloured bar, no label naming the kind -- the icon already does, in any language.
 */
const ICONS: Record<ToastIconName, { Icon: typeof CircleCheck; tone: string }> = {
  success: { Icon: CircleCheck, tone: "text-emerald-600 dark:text-emerald-400" },
  error: { Icon: CircleAlert, tone: "text-destructive" },
  "server-error": { Icon: CircleAlert, tone: "text-destructive" },
  warning: { Icon: TriangleAlert, tone: "text-amber-500 dark:text-amber-400" },
  information: { Icon: Info, tone: "text-sky-600 dark:text-sky-400" },
  notice: { Icon: Info, tone: "text-muted-foreground" },
  trash: { Icon: Trash2, tone: "text-muted-foreground" },
  undo: { Icon: Undo2, tone: "text-muted-foreground" },
};

const ICON_BY_VARIANT: Record<ToastVariant, ToastIconName> = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "information",
  default: "notice",
};

/**
 * The note that pops up after something is done (owner, 2026-09-29: "small and minimal and clean
 * professional like shopify uses and other big tech uses"): a small card with an icon, one line of
 * words, an action where the caller offers one, and a close mark.
 *
 * **One line, always** (the owner, the same day). What does not fit -- a reason under a title, or a
 * sentence longer than the card -- waits behind "Show more", which opens the whole of it; the note
 * then stays until it is closed (`onExpand`), since whoever opened it is reading.
 *
 * It replaced a card with a coloured bar naming the kind, a large circled icon and a footer with a
 * Close button -- three rows of chrome around one line of news. Its corners are the cards' own.
 * Where it appears, and for how long, is `NotificationViewport`'s and `NotificationProvider`'s
 * business.
 */
export function Toast({ variant, message, title, action, iconName, onClose, onExpand }: ToastProps) {
  const tCommon = useTranslations("common");
  const { Icon, tone } = ICONS[iconName ?? ICON_BY_VARIANT[variant]];
  const failed = variant === "error" || iconName === "error" || iconName === "server-error";

  // The line is the title where there is one, else the message; the message under a title is more.
  const headline = title ?? message;
  const detail = title ? message : undefined;
  const [expanded, setExpanded] = useState(false);
  // A single sentence may still be longer than one line; only the browser can say, once drawn.
  const lineRef = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const line = lineRef.current;
    if (line && !expanded) setCut(line.scrollWidth > line.clientWidth + 1);
  }, [headline, expanded]);
  const more = Boolean(detail) || cut;

  return (
    <div
      // An error interrupts a screen reader; good news waits its turn.
      role={failed ? "alert" : "status"}
      aria-live={failed ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full gap-3 rounded-card border border-border-subtle",
        "bg-popover px-3.5 py-3 text-popover-foreground [box-shadow:var(--shadow-popover)]",
        expanded ? "items-start" : "items-center",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-[18px] shrink-0", expanded && "mt-px", tone)}
        strokeWidth={1.75}
      />

      <div className="min-w-0 flex-1">
        <p
          ref={lineRef}
          className={cn(
            "text-sm leading-5",
            detail && "font-medium",
            expanded ? "whitespace-pre-line break-words" : "truncate",
          )}
        >
          {headline}
        </p>
        {expanded && detail ? (
          <p className="mt-0.5 whitespace-pre-line break-words text-[13px] leading-5 text-muted-foreground">{detail}</p>
        ) : null}
        {expanded ? (
          <button type="button" onClick={() => setExpanded(false)} className={cn(LINK_BUTTON, "mt-1 px-0")}>
            {tCommon("showLess")}
          </button>
        ) : null}
      </div>

      {more && !expanded ? (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => {
            setExpanded(true);
            onExpand?.();
          }}
          className={cn(LINK_BUTTON, "shrink-0 text-muted-foreground hover:text-foreground")}
        >
          {tCommon("showMore")}
        </button>
      ) : null}

      {/* Only where there is something to do -- Undo, View. */}
      {action ? (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onClose?.();
          }}
          className={cn(LINK_BUTTON, "shrink-0 text-primary")}
        >
          {action.label}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        aria-label={tCommon("close")}
        className="-my-0.5 -mr-1 grid size-6 shrink-0 place-items-center rounded-button text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

/** A button that reads as a word: Show more, Undo. */
const LINK_BUTTON =
  "rounded-button px-1 text-[13px] font-medium leading-5 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
