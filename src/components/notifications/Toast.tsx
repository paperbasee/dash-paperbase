"use client";

import { CircleAlert, CircleCheck, Info, Trash2, TriangleAlert, Undo2, X } from "lucide-react";
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
 * professional like shopify uses and other big tech uses"): a small card with an icon, the words,
 * an action where the caller offers one, and a close mark.
 *
 * It replaced a card with a coloured bar naming the kind, a large circled icon and a footer with a
 * Close button -- three rows of chrome around one line of news. Where it appears, and for how long,
 * is `NotificationViewport`'s and `NotificationProvider`'s business.
 */
export function Toast({ variant, message, title, action, iconName, onClose }: ToastProps) {
  const tCommon = useTranslations("common");
  const { Icon, tone } = ICONS[iconName ?? ICON_BY_VARIANT[variant]];
  const failed = variant === "error" || iconName === "error" || iconName === "server-error";

  return (
    <div
      // An error interrupts a screen reader; good news waits its turn.
      role={failed ? "alert" : "status"}
      aria-live={failed ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-popover border border-border-subtle",
        "bg-popover px-3.5 py-3 text-popover-foreground [box-shadow:var(--shadow-popover)]",
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-px size-[18px] shrink-0", tone)} strokeWidth={1.75} />

      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-medium leading-5">{title}</p> : null}
        <p
          className={cn(
            "whitespace-pre-line leading-5",
            title ? "mt-0.5 text-[13px] text-muted-foreground" : "text-sm",
          )}
        >
          {message}
        </p>
      </div>

      {/* Only where there is something to do -- Undo, View. */}
      {action ? (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onClose?.();
          }}
          className="shrink-0 rounded-button px-1 text-[13px] font-medium leading-5 text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
