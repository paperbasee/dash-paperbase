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
import { Toast, type ToastAction, type ToastVariant } from "@/components/notifications/Toast";
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
  ConfirmOptions,
  FieldErrors,
  MessageDescriptor,
  NotificationId,
  NotifyOptions,
  PromptOptions,
} from "./types";

type PromptResult = { confirmed: boolean; value?: string };

type ModalRequest =
  | {
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (result: boolean) => void;
    }
  | {
      kind: "prompt";
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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const DEFAULT_DURATION_MS = 5000;
  const t = useTranslations();
  const [validationByForm, setValidationByForm] = useState<Record<string, FieldErrors>>({});
  const [modalRequest, setModalRequest] = useState<ModalRequest | null>(null);
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
    }: {
      id: string;
      durationMs?: number;
      variant: ToastVariant;
      message: string;
      title?: string;
      action?: ToastAction;
      persistent?: boolean;
    }) => {
      toast.custom(
        () => (
          <Toast
            variant={variant}
            title={title}
            message={message}
            action={action}
            onClose={() => toast.dismiss(id)}
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
      return showToast({
        id,
        durationMs: options?.durationMs,
        variant: kind,
        message: text,
        title: options?.title ? resolveMessage(options.title) : titleByVariant[kind],
        action: options?.action
          ? {
              label: resolveMessage(options.action.label),
              onClick: options.action.onClick,
            }
          : undefined,
        persistent: options?.persistent,
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
      confirm: (options: ConfirmOptions) =>
        new Promise<boolean>((resolve) => setModalRequest({ kind: "confirm", options, resolve })),
      prompt: (options: PromptOptions) =>
        new Promise<PromptResult>((resolve) => {
          setPromptValue(options.defaultValue ?? "");
          setModalRequest({ kind: "prompt", options, resolve });
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
      <Dialog open={!!modalRequest} onOpenChange={(open) => !open && setModalRequest(null)}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-1.5rem)] max-w-md rounded-xl sm:w-full"
        >
          <DialogHeader
            className={cn(
              "gap-1 p-4 sm:p-6",
              modalRequest?.options.level === "destructive" && "border-b-0",
            )}
          >
            <DialogTitle>
              {modalRequest ? resolveMessage(modalRequest.options.title) : ""}
            </DialogTitle>
            {modalRequest?.options.body ? (
              <DialogDescription>{resolveMessage(modalRequest.options.body)}</DialogDescription>
            ) : null}
          </DialogHeader>
          {modalRequest?.kind === "prompt" ? (
            <div className="px-4 sm:px-6">
              <Input
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={
                  modalRequest.options.placeholder
                    ? resolveMessage(modalRequest.options.placeholder)
                    : ""
                }
              />
            </div>
          ) : null}
          <DialogFooter
            className={cn(
              "gap-2 p-4 sm:gap-3 sm:p-6",
              modalRequest?.options.level === "destructive" && "border-t-0",
            )}
          >
            <Button
              variant="outline"
              onClick={() => {
                if (!modalRequest) return;
                if (modalRequest.kind === "confirm") modalRequest.resolve(false);
                if (modalRequest.kind === "prompt") modalRequest.resolve({ confirmed: false });
                setModalRequest(null);
              }}
            >
              {modalRequest?.options.cancelLabel
                ? resolveMessage(modalRequest.options.cancelLabel)
                : "Cancel"}
            </Button>
            <Button
              variant={modalRequest?.options.level === "destructive" ? "destructive" : "default"}
              onClick={() => {
                if (!modalRequest) return;
                if (modalRequest.kind === "confirm") {
                  modalRequest.resolve(true);
                } else {
                  if (modalRequest.options.required && !promptValue.trim()) return;
                  modalRequest.resolve({ confirmed: true, value: promptValue });
                }
                setModalRequest(null);
              }}
            >
              {modalRequest?.options.confirmLabel
                ? resolveMessage(modalRequest.options.confirmLabel)
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
