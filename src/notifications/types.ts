export type NotificationLevel =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading"
  | "validation"
  | "destructive";

export type NotificationSurface = "toast" | "inline" | "modal" | "banner";

export type NotificationId = string;

export type FieldErrors = Record<string, string>;

export type MessageDescriptor =
  | string
  | {
      key: string;
      values?: Record<string, string | number | boolean | null | undefined>;
      fallback?: string;
    };

export type NormalizedError = {
  message: string;
  fieldErrors?: FieldErrors;
  code?: string;
  raw?: unknown;
};

export type PromptOptions = {
  title: MessageDescriptor;
  body?: MessageDescriptor;
  confirmLabel?: MessageDescriptor;
  cancelLabel?: MessageDescriptor;
  level?: Extract<NotificationLevel, "warning" | "destructive" | "info">;
  placeholder?: MessageDescriptor;
  defaultValue?: string;
  required?: boolean;
};

export type NotifyOptions = {
  id?: string;
  durationMs?: number;
  dedupeKey?: string;
  surface?: NotificationSurface;
  title?: MessageDescriptor;
  /** Overrides the default toast icon (if surface is "toast"). */
  iconName?:
    | "success"
    | "information"
    | "warning"
    | "error"
    | "server-error"
    | "trash"
    | "undo";
  action?: {
    label: MessageDescriptor;
    onClick: () => void;
  };
  persistent?: boolean;
};
