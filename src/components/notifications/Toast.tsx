"use client";

import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastProps = {
  variant: ToastVariant;
  message: string;
  title?: string;
  action?: ToastAction;
};

const variantStyles: Record<ToastVariant, { icon: ComponentType<{ className?: string }>; root: string; iconWrap: string }> = {
  success: {
    icon: CheckCircle2,
    root: "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
    iconWrap: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
  },
  error: {
    icon: XCircle,
    root: "border-destructive/40 bg-destructive/10 text-rose-950 dark:text-rose-100",
    iconWrap: "bg-destructive/20 text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    root: "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    iconWrap: "bg-amber-500/20 text-amber-600 dark:text-amber-300",
  },
  info: {
    icon: Info,
    root: "border-blue-500/40 bg-blue-500/10 text-blue-950 dark:text-blue-100",
    iconWrap: "bg-blue-500/20 text-blue-600 dark:text-blue-300",
  },
};

export function Toast({ variant, message, title, action }: ToastProps) {
  const Icon = variantStyles[variant].icon;

  return (
    <div
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-xl border shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/95",
        "px-4 py-3 transition-all duration-300 ease-out",
        "data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 data-[state=closed]:fade-out-0",
        variantStyles[variant].root,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 rounded-lg p-1.5", variantStyles[variant].iconWrap)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold leading-5 tracking-tight">{title}</p> : null}
          <p className={cn("text-sm leading-5", title ? "mt-0.5 opacity-90" : "font-medium")}>{message}</p>
        </div>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="rounded-md border border-border/70 bg-background/70 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-background"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
