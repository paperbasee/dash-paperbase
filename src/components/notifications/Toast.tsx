"use client";

import { AlertTriangle, CircleCheck, Info, XCircle } from "lucide-react";
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

export function Toast({ variant, message, title, action, iconName }: ToastProps) {
  const variantByIconName: Record<ToastIconName, ToastVariant> = {
    success: "success",
    information: "info",
    warning: "warning",
    error: "error",
    "server-error": "error",
    trash: "warning",
    undo: "info",
  };

  const resolvedVariant = iconName ? variantByIconName[iconName] : variant;
  const iconByVariant = {
    success: CircleCheck,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  } satisfies Record<ToastVariant, typeof CircleCheck>;
  const iconTintByVariant: Record<ToastVariant, { tile: string; icon: string }> = {
    success: {
      tile: "bg-emerald-500/12 dark:bg-emerald-500/18",
      icon: "text-emerald-600 dark:text-emerald-400",
    },
    error: {
      tile: "bg-rose-500/12 dark:bg-rose-500/18",
      icon: "text-rose-600 dark:text-rose-400",
    },
    warning: {
      tile: "bg-amber-500/14 dark:bg-amber-500/20",
      icon: "text-amber-600 dark:text-amber-400",
    },
    info: {
      tile: "bg-sky-500/12 dark:bg-sky-500/18",
      icon: "text-sky-600 dark:text-sky-400",
    },
  };
  const descriptionToneByVariant: Record<ToastVariant, string> = {
    success: "text-emerald-500 dark:text-emerald-400",
    error: "text-rose-500 dark:text-rose-400",
    warning: "text-amber-500 dark:text-amber-400",
    info: "text-sky-500 dark:text-sky-400",
  };
  const Icon = iconByVariant[resolvedVariant];
  const iconTone = iconTintByVariant[resolvedVariant];
  const descriptionTone = descriptionToneByVariant[resolvedVariant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto relative flex h-[4.5rem] w-full items-center overflow-hidden rounded-xl border border-border/80",
        "bg-card text-foreground shadow-[0_6px_18px_-12px_rgba(0,0,0,0.45)] ring-1 ring-border/35",
        "px-3.5 py-2 transition-all duration-250 ease-out",
        "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-3 data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:fade-out-0",
      )}
    >
      <div className="flex w-full items-center gap-2.5">
        <div
          aria-hidden="true"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            iconTone.tile,
          )}
        >
          <Icon className={cn("h-5 w-5", iconTone.icon)} strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold leading-5 tracking-tight text-foreground">
              {title ?? "Notification"}
            </p>
            {action ? (
              <button
                type="button"
                onClick={action.onClick}
                className="shrink-0 rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium leading-none text-foreground transition hover:bg-muted/80"
              >
                {action.label}
              </button>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-0.5 text-sm leading-[1.25rem]",
              descriptionTone,
              "overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]",
            )}
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
