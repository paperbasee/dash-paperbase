import type {
  ConfirmOptions,
  FieldErrors,
  MessageDescriptor,
  NotificationId,
  NotifyOptions,
  PromptOptions,
} from "./types";

type PromptResult = { confirmed: boolean; value?: string };

type Dispatcher = {
  success: (message: MessageDescriptor, options?: NotifyOptions) => NotificationId;
  info: (message: MessageDescriptor, options?: NotifyOptions) => NotificationId;
  warning: (message: MessageDescriptor, options?: NotifyOptions) => NotificationId;
  error: (error: unknown, options?: NotifyOptions & { fallbackMessage?: MessageDescriptor }) => NotificationId;
  loading: (message: MessageDescriptor, options?: NotifyOptions) => { id: NotificationId; done: () => void; fail: (error?: unknown) => void };
  validation: (formId: string, fieldErrors: FieldErrors) => void;
  clearValidation: (formId: string, fieldNames?: string[]) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<PromptResult>;
  banner: (message: MessageDescriptor, options?: NotifyOptions) => NotificationId;
};

let dispatcher: Dispatcher | null = null;

export function registerNotifyDispatcher(next: Dispatcher | null) {
  dispatcher = next;
}

function mustGet(): Dispatcher {
  if (!dispatcher) {
    throw new Error("notify dispatcher is not registered. Wrap app with NotificationProvider.");
  }
  return dispatcher;
}

export const notify = {
  success(message: MessageDescriptor, options?: NotifyOptions) {
    return mustGet().success(message, options);
  },
  info(message: MessageDescriptor, options?: NotifyOptions) {
    return mustGet().info(message, options);
  },
  warning(message: MessageDescriptor, options?: NotifyOptions) {
    return mustGet().warning(message, options);
  },
  error(error: unknown, options?: NotifyOptions & { fallbackMessage?: MessageDescriptor }) {
    return mustGet().error(error, options);
  },
  loading(message: MessageDescriptor, options?: NotifyOptions) {
    return mustGet().loading(message, options);
  },
  validation(formId: string, fieldErrors: FieldErrors) {
    return mustGet().validation(formId, fieldErrors);
  },
  clearValidation(formId: string, fieldNames?: string[]) {
    return mustGet().clearValidation(formId, fieldNames);
  },
  confirm(options: ConfirmOptions) {
    return mustGet().confirm(options);
  },
  prompt(options: PromptOptions) {
    return mustGet().prompt(options);
  },
  banner(message: MessageDescriptor, options?: NotifyOptions) {
    return mustGet().banner(message, options);
  },
};

export type NotifyApi = typeof notify;
