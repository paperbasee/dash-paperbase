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
import { extractRateLimitInfo } from "@/hooks/useRateLimitCooldown";
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
    default: "notice",
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
        // next-intl answers a missing key with the key itself, so without this check a
        // forgotten key reached the merchant as "common.toastSomething" on screen. The
        // descriptor's own fallback is a readable sentence, so it wins over that.
        if (!translated || translated === message.key) {
          return message.fallback || UNKNOWN_ERROR_FALLBACK;
        }
        return translated;
      } catch {
        return message.fallback || message.key || UNKNOWN_ERROR_FALLBACK;
      }
    },
    [t],
  );

  /**
   * What an error toast says when the server sent nothing readable. It was the English
   * sentence in normalizeError; a Bangla shop now gets a Bangla one, with that sentence
   * kept only as the very last resort if the key ever goes missing.
   */
  const unknownErrorText = useCallback(
    () => resolveMessage({ key: "common.toastUnknownError", fallback: UNKNOWN_ERROR_FALLBACK }),
    [resolveMessage],
  );

  const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // How long each kind stays (owner, 2026-09-29): good news is read at a glance and goes; an
  // error stays long enough to read its reason -- it stayed until closed, and they piled up.
  const defaultDurationMsByVariant: Record<ToastVariant, number> = {
    success: 3000,
    info: 4000,
    warning: 6000,
    error: 8000,
    default: 4000,
  };

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
      const duration =
        persistent
          ? Number.POSITIVE_INFINITY
          : (durationMs ?? defaultDurationMsByVariant[variant] ?? DEFAULT_DURATION_MS);
      toast.custom(
        () => (
          <Toast
            variant={variant}
            title={title}
            message={message}
            action={action}
            iconName={iconName}
            onClose={() => toast.dismiss(id)}
          />
        ),
        { id, duration },
      );
      return id;
    },
    [DEFAULT_DURATION_MS],
  );

  const pushToast = useCallback(
    (kind: "success" | "info" | "warning" | "error", message: MessageDescriptor, options?: NotifyOptions) => {
      const text = resolveMessage(message);
      const id = options?.id ?? makeId();
      // No default title. It used to be the English word for the kind ("Success", "Warning"),
      // which the toast's icon already says, in no language at all.
      const resolvedTitle = options?.title ? resolveMessage(options.title) : undefined;
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
        const rl = extractRateLimitInfo(error);
        if (rl) {
          const seconds = Math.max(1, Math.ceil(rl.retryAfter));
          const durationMs = Math.min(
            60_000,
            Math.max(8_000, Math.min(45_000, seconds * 1000)),
          );
          return pushToast(
            "warning",
            {
              // These two keys did not exist, so every rate-limit toast printed the English
              // fallback below — or, worse, the raw key. They live in `common` with the rest
              // of the toast words now.
              key: "common.toastRateLimitBody",
              values: { seconds },
              fallback: `Too many attempts. Please wait ${seconds} seconds, then try again.`,
            },
            {
              ...options,
              title: {
                key: "common.toastRateLimitTitle",
                fallback: "Slow down",
              },
              durationMs: options?.durationMs ?? durationMs,
              iconName: "warning",
            },
          );
        }
        const fallbackText = options?.fallbackMessage
          ? resolveMessage(options.fallbackMessage)
          : unknownErrorText();
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
          title: options?.title ? resolveMessage(options.title) : t("common.loading"),
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
              const normalized = normalizeError(error, unknownErrorText());
              showToast({
                id: `${id}-error`,
                variant: "error",
                // No title: the toast's coloured bar names the kind in the merchant's
                // language, where this said "Error" in English.
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
  }, [clearValidation, pushToast, resolveMessage, showToast, t, unknownErrorText]);

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
          className="w-[calc(100%-1.5rem)] max-w-md rounded-card sm:w-full"
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
                : t("common.cancel")}
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
                : t("common.confirm")}
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
