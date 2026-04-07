"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast, type ToastAction, type ToastIconName, type ToastVariant } from "@/components/notifications/Toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { normalizeError, UNKNOWN_ERROR_FALLBACK } from "./normalizeError";
import { registerNotifyDispatcher } from "./notify";
import type {
  FieldErrors,
  MessageDescriptor,
  NotificationId,
  NotifyOptions,
  PromptOptions,
} from "./types";

type PromptResult = { confirmed: boolean; value?: string };

type PromptRequest = {
  options: PromptOptions;
  resolve: (result: PromptResult) => void;
};

type ContextValue = {
  getValidation: (formId: string) => FieldErrors;
  clearValidation: (formId: string, fieldNames?: string[]) => void;
};

const NotificationContext = createContext<ContextValue | undefined>(undefined);

function isDescriptor(value: MessageDescriptor): value is Exclude<MessageDescriptor, string> {
  return typeof value === "object" && value !== null && "key" in value;
}

function inferToastIconName(input: {
  variant: ToastVariant;
  title?: string;
  message: string;
}): ToastIconName {
  const haystack = `${input.title ?? ""} ${input.message}`.toLowerCase();

  // Prefer intent-based icons over generic variant icons.
  if (/(server|internal server|gateway|502|503|504|500)\b/.test(haystack)) return "server-error";
  if (/(delete|deleted|remove|removed|trash)\b/.test(haystack)) return "trash";
  if (/(restore|restored|undo)\b/.test(haystack)) return "undo";

  const defaultIconNameByVariant: Record<ToastVariant, ToastIconName> = {
    success: "success",
    info: "information",
    warning: "warning",
    error: "error",
  };

  return defaultIconNameByVariant[input.variant];
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const DEFAULT_DURATION_MS = 5000;
  const t = useTranslations();
  const [validationByForm, setValidationByForm] = useState<Record<string, FieldErrors>>({});
  const [promptRequest, setPromptRequest] = useState<PromptRequest | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [bannerText, setBannerText] = useState<string | null>(null);

  const resolveMessage = useCallback(
    (message: MessageDescriptor) => {
      if (!isDescriptor(message)) return message;
      try {
        const translated = t(message.key as never, (message.values ?? {}) as never);
        return translated || message.fallback || UNKNOWN_ERROR_FALLBACK;
      } catch {
        return message.fallback || message.key || UNKNOWN_ERROR_FALLBACK;
      }
    },
    [t],
  );

  const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const showToast = useCallback(
    ({
      id,
      durationMs,
      variant,
      message,
      title,
      action,
      persistent,
      iconName,
    }: {
      id: string;
      durationMs?: number;
      variant: ToastVariant;
      message: string;
      title?: string;
      action?: ToastAction;
      persistent?: boolean;
      iconName?: ToastIconName;
    }) => {
      toast.custom(
        () => (
          <Toast
            variant={variant}
            title={title}
            message={message}
            action={action}
            iconName={iconName}
          />
        ),
        { id, duration: persistent ? Number.POSITIVE_INFINITY : (durationMs ?? DEFAULT_DURATION_MS) },
      );
      return id;
    },
    [DEFAULT_DURATION_MS],
  );

  const pushToast = useCallback(
    (kind: "success" | "info" | "warning" | "error", message: MessageDescriptor, options?: NotifyOptions) => {
      const text = resolveMessage(message);
      const id = options?.id ?? makeId();
      const titleByVariant: Record<typeof kind, string> = {
        success: "Success",
        info: "Info",
        warning: "Warning",
        error: "Error",
      };

      const resolvedTitle = options?.title ? resolveMessage(options.title) : titleByVariant[kind];
      const inferredIconName = inferToastIconName({
        variant: kind,
        title: resolvedTitle,
        message: text,
      });

      return showToast({
        id,
        durationMs: options?.durationMs,
        variant: kind,
        message: text,
        title: resolvedTitle,
        action: options?.action
          ? {
              label: resolveMessage(options.action.label),
              onClick: options.action.onClick,
            }
          : undefined,
        persistent: options?.persistent,
        iconName: options?.iconName ?? inferredIconName,
      });
    },
    [resolveMessage, showToast],
  );

  const clearValidation = useCallback((formId: string, fieldNames?: string[]) => {
    setValidationByForm((prev) => {
      if (!prev[formId]) return prev;
      if (!fieldNames || fieldNames.length === 0) {
        const next = { ...prev };
        delete next[formId];
        return next;
      }
      const current = { ...prev[formId] };
      for (const field of fieldNames) delete current[field];
      return { ...prev, [formId]: current };
    });
  }, []);

  useEffect(() => {
    const dispatcher = {
      success: (message: MessageDescriptor, options?: NotifyOptions): NotificationId =>
        pushToast("success", message, options),
      info: (message: MessageDescriptor, options?: NotifyOptions): NotificationId =>
        pushToast("info", message, options),
      warning: (message: MessageDescriptor, options?: NotifyOptions): NotificationId =>
        pushToast("warning", message, options),
      error: (
        error: unknown,
        options?: NotifyOptions & { fallbackMessage?: MessageDescriptor },
      ): NotificationId => {
        const fallbackText = options?.fallbackMessage
          ? resolveMessage(options.fallbackMessage)
          : UNKNOWN_ERROR_FALLBACK;
        const normalized = normalizeError(error, fallbackText);
        if (normalized.fieldErrors && Object.keys(normalized.fieldErrors).length > 0 && options?.dedupeKey) {
          setValidationByForm((prev) => ({ ...prev, [options.dedupeKey!]: normalized.fieldErrors! }));
          return options?.id ?? makeId();
        }
        return pushToast("error", normalized.message, options);
      },
      loading: (message: MessageDescriptor, options?: NotifyOptions) => {
        const id = options?.id ?? makeId();
        showToast({
          id,
          variant: "info",
          title: options?.title ? resolveMessage(options.title) : "Loading",
          message: resolveMessage(message),
          action: options?.action
            ? {
                label: resolveMessage(options.action.label),
                onClick: options.action.onClick,
              }
            : undefined,
          persistent: true,
        });
        return {
          id,
          done: () => toast.dismiss(id),
          fail: (error?: unknown) => {
            toast.dismiss(id);
            if (error) {
              const normalized = normalizeError(error);
              showToast({
                id: `${id}-error`,
                variant: "error",
                title: "Error",
                message: normalized.message,
                persistent: options?.persistent,
              });
            }
          },
        };
      },
      validation: (formId: string, fieldErrors: FieldErrors) => {
        setValidationByForm((prev) => ({ ...prev, [formId]: fieldErrors }));
      },
      clearValidation,
      prompt: (options: PromptOptions) =>
        new Promise<PromptResult>((resolve) => {
          setPromptValue(options.defaultValue ?? "");
          setPromptRequest({ options, resolve });
        }),
      banner: (message: MessageDescriptor, options?: NotifyOptions) => {
        const id = options?.id ?? makeId();
        setBannerText(resolveMessage(message));
        return id;
      },
    };

    registerNotifyDispatcher(dispatcher);
    return () => registerNotifyDispatcher(null);
  }, [clearValidation, pushToast, resolveMessage, showToast]);

  const contextValue = useMemo<ContextValue>(
    () => ({
      getValidation: (formId: string) => validationByForm[formId] ?? {},
      clearValidation,
    }),
    [clearValidation, validationByForm],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {bannerText ? (
        <div className="fixed left-0 top-0 z-[70] w-full border-b border-border bg-muted px-4 py-2 text-center text-sm">
          {bannerText}
        </div>
      ) : null}
      {children}
      <Dialog
        open={!!promptRequest}
        onOpenChange={(open) => {
          if (open) return;
          setPromptRequest((current) => {
            if (current) current.resolve({ confirmed: false });
            return null;
          });
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-1.5rem)] max-w-md rounded-xl sm:w-full"
        >
          <DialogHeader
            className={cn(
              "gap-1 border-b border-border p-4 sm:p-6",
              promptRequest?.options.level === "destructive" && "border-b-0",
            )}
          >
            <DialogTitle>
              {promptRequest ? resolveMessage(promptRequest.options.title) : ""}
            </DialogTitle>
            {promptRequest?.options.body ? (
              <DialogDescription>{resolveMessage(promptRequest.options.body)}</DialogDescription>
            ) : null}
          </DialogHeader>
          {promptRequest ? (
            <div className="px-4 sm:px-6">
              <Input
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={
                  promptRequest.options.placeholder
                    ? resolveMessage(promptRequest.options.placeholder)
                    : ""
                }
              />
            </div>
          ) : null}
          <DialogFooter
            className={cn(
              "gap-2 border-t border-border p-4 sm:gap-3 sm:p-6",
              promptRequest?.options.level === "destructive" && "border-t-0",
            )}
          >
            <Button
              variant="outline"
              onClick={() => {
                if (!promptRequest) return;
                promptRequest.resolve({ confirmed: false });
                setPromptRequest(null);
              }}
            >
              {promptRequest?.options.cancelLabel
                ? resolveMessage(promptRequest.options.cancelLabel)
                : "Cancel"}
            </Button>
            <Button
              variant={promptRequest?.options.level === "destructive" ? "destructive" : "default"}
              onClick={() => {
                if (!promptRequest) return;
                if (promptRequest.options.required && !promptValue.trim()) return;
                promptRequest.resolve({ confirmed: true, value: promptValue });
                setPromptRequest(null);
              }}
            >
              {promptRequest?.options.confirmLabel
                ? resolveMessage(promptRequest.options.confirmLabel)
                : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NotificationContext.Provider>
  );
}

export function useNotificationValidation(formId: string) {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationValidation must be used within NotificationProvider.");
  return {
    fieldErrors: ctx.getValidation(formId),
    clearValidation: (fieldNames?: string[]) => ctx.clearValidation(formId, fieldNames),
  };
}
