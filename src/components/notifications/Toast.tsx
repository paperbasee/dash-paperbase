"use client";

import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastIconName =
  | "success"
  | "information"
  | "warning"
  | "error"
  | "server-error"
  | "trash"
  | "undo";

type ToastProps = {
  variant: ToastVariant;
  message: string;
  title?: string;
  action?: ToastAction;
  iconName?: ToastIconName;
};

const iconSrcByName: Record<ToastIconName, string> = {
  success: "/assets/popup-notif/notif-success.png",
  information: "/assets/popup-notif/notif-information.png",
  warning: "/assets/popup-notif/notif-warning.png",
  error: "/assets/popup-notif/notif-error.png",
  "server-error": "/assets/popup-notif/notif-server-error.png",
  trash: "/assets/popup-notif/notif-trash.png",
  undo: "/assets/popup-notif/notif-undo.png",
};

const defaultIconNameByVariant: Record<ToastVariant, ToastIconName> = {
  success: "success",
  info: "information",
  warning: "warning",
  error: "error",
};

export function Toast({ variant, message, title, action, iconName }: ToastProps) {
  const iconSrc = iconSrcByName[iconName ?? defaultIconNameByVariant[variant]];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-none border border-zinc-900/10 dark:border-white/15",
        "bg-background text-foreground shadow-none",
        "p-4 transition-all duration-250 ease-out",
        "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-3 data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:fade-out-0",
      )}
    >
      <div className="flex items-start gap-3">
        <img
          src={iconSrc}
          alt=""
          aria-hidden="true"
          className="mt-0.5 h-10 w-10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 tracking-tight text-foreground">
            {title ?? "Notification"}
          </p>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{message}</p>
          {action ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={action.onClick}
                className="rounded-ui border border-border bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/80"
              >
                {action.label}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
