"use client";

import { AlertTriangle, Check, Info, Zap } from "lucide-react";
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

export function Toast({ variant, message, title, action, iconName, onClose }: ToastProps) {
  const tCommon = useTranslations("common");

  const variantByIconName: Record<ToastIconName, ToastVariant> = {
    success: "success",
    information: "info",
    warning: "warning",
    error: "error",
    notice: "default",
    "server-error": "error",
    trash: "warning",
    undo: "info",
  };

  const resolvedVariant: ToastVariant = iconName ? variantByIconName[iconName] : variant;

  const iconByVariant = {
    success: Check,
    error: Zap,
    warning: AlertTriangle,
    info: Info,
    default: Info,
  } satisfies Record<ToastVariant, typeof Check>;

  const ui: Record<
    ToastVariant,
    {
      headerBg: string;
      headerBorder: string;
      headerLabelText: string;
      headerLabel: string;
      iconBg: string;
      iconBorder: string;
      iconColor: string;
      iconNudge: string;
      titleText: string;
      primaryButton: string;
    }
  > = {
    success: {
      headerBg: "bg-green-50 dark:bg-green-950/50",
      headerBorder: "border-green-100 dark:border-green-900",
      headerLabelText: "text-green-700 dark:text-green-400",
      headerLabel: "Success",
      iconBg: "bg-green-50 dark:bg-green-950/60",
      iconBorder: "border-green-200 dark:border-green-800",
      iconColor: "text-green-600 dark:text-green-400",
      iconNudge: "",
      titleText: "text-green-800 dark:text-green-300",
      primaryButton:
        "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white",
    },
    error: {
      headerBg: "bg-red-50 dark:bg-red-950/50",
      headerBorder: "border-red-100 dark:border-red-900",
      headerLabelText: "text-red-700 dark:text-red-400",
      headerLabel: "Error dialog",
      iconBg: "bg-red-50 dark:bg-red-950/60",
      iconBorder: "border-red-200 dark:border-red-800",
      iconColor: "text-red-600 dark:text-red-400",
      iconNudge: "",
      titleText: "text-red-800 dark:text-red-300",
      primaryButton:
        "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white",
    },
    warning: {
      headerBg: "bg-amber-50 dark:bg-amber-950/50",
      headerBorder: "border-amber-100 dark:border-amber-900",
      headerLabelText: "text-amber-700 dark:text-amber-400",
      headerLabel: "Warning",
      iconBg: "bg-amber-50 dark:bg-amber-950/60",
      iconBorder: "border-amber-200 dark:border-amber-800",
      iconColor: "text-amber-600 dark:text-amber-400",
      iconNudge: "-translate-x-px -translate-y-[3px]",
      titleText: "text-amber-800 dark:text-amber-300",
      primaryButton:
        "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white",
    },
    info: {
      headerBg: "bg-blue-50 dark:bg-blue-950/50",
      headerBorder: "border-blue-100 dark:border-blue-900",
      headerLabelText: "text-blue-700 dark:text-blue-400",
      headerLabel: "Info",
      iconBg: "bg-blue-50 dark:bg-blue-950/60",
      iconBorder: "border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400",
      iconNudge: "",
      titleText: "text-blue-800 dark:text-blue-300",
      primaryButton:
        "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white",
    },
    default: {
      headerBg: "bg-gray-100 dark:bg-gray-800/60",
      headerBorder: "border-gray-200 dark:border-gray-700",
      headerLabelText: "text-gray-600 dark:text-gray-300",
      headerLabel: "Notice",
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconBorder: "border-gray-200 dark:border-gray-700",
      iconColor: "text-gray-500 dark:text-gray-400",
      iconNudge: "",
      titleText: "text-gray-800 dark:text-gray-200",
      primaryButton:
        "bg-gray-700 hover:bg-gray-800 active:bg-gray-900 text-white",
    },
  };

  const Icon = iconByVariant[resolvedVariant];
  const config = ui[resolvedVariant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // Size & shape
        "pointer-events-auto relative w-[min(92vw,22rem)] overflow-hidden rounded-xs",
        // Border
        "border border-gray-200 dark:border-zinc-700",
        // Background
        "bg-white dark:bg-zinc-900",
        // Shadow — slightly softer, more natural
        "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_1px_4px_-1px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]",
        // Entrance / exit animations
        "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-3 data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:fade-out-0",
      )}
    >
      {/* ── Header bar ── */}
      <div
        className={cn(
          "flex items-center border-b px-4 py-2.5",
          config.headerBg,
          config.headerBorder,
        )}
      >
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-widest",
            config.headerLabelText,
          )}
        >
          {config.headerLabel}
        </span>
      </div>

      {/* ── Body ── */}
      <div className="flex items-center gap-4 px-5 py-5">
        {/* Circle icon — tinted to match variant */}
        <div
          aria-hidden="true"
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full border",
            config.iconBg,
            config.iconBorder,
          )}
        >
          <Icon
            className={cn("size-7 shrink-0", config.iconColor, config.iconNudge)}
            strokeWidth={2.2}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn("text-[15px] font-semibold leading-snug", config.titleText)}>
            {title ?? "Notification"}
          </p>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
            {message}
          </p>
        </div>
      </div>

      {/* ── Footer / Buttons ── */}
      <div className="border-t border-gray-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center justify-end gap-2">
          {/* Ghost / secondary */}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "h-9 rounded-xs border border-gray-200 bg-white px-4 text-[13px] font-medium",
              "text-gray-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300",
              "transition-colors hover:bg-gray-50 active:bg-gray-100",
              "dark:hover:bg-zinc-800 dark:active:bg-zinc-700",
            )}
          >
            {action ? "Secondary" : "Dismiss"}
          </button>

          {/* Primary */}
          {action ? (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                onClose?.();
              }}
              className={cn(
                "h-9 rounded-xs px-4 text-[13px] font-medium transition-colors",
                config.primaryButton,
              )}
            >
              {action.label}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "h-9 rounded-xs px-4 text-[13px] font-medium transition-colors",
                config.primaryButton,
              )}
            >
              {tCommon("confirm")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}