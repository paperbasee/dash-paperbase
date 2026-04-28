"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ConfirmDialog,
  type ConfirmDialogVariant,
} from "@/components/ui/ConfirmDialog";

export type ConfirmDialogOptions = {
  title?: ReactNode;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  onConfirm?: () => void | Promise<void>;
};

type QueueEntry = {
  options: ConfirmDialogOptions;
  resolve: (result: boolean) => void;
};

type ConfirmFn = (options: ConfirmDialogOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | undefined>(undefined);

function asDialogText(value: ReactNode | undefined, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function normalizeDialogText(value: string): string {
  return value.trim().toLowerCase().replace(/[?.!,:;'"`]/g, "");
}

function toWordSet(value: string): Set<string> {
  return new Set(normalizeDialogText(value).split(/\s+/).filter(Boolean));
}

function isDescriptionTooSimilar(title: string, description: string): boolean {
  const titleWords = toWordSet(title);
  const descriptionWords = toWordSet(description);
  if (titleWords.size === 0 || descriptionWords.size === 0) return false;

  let overlap = 0;
  for (const word of descriptionWords) {
    if (titleWords.has(word)) overlap += 1;
  }

  const overlapRatio = overlap / Math.min(titleWords.size, descriptionWords.size);
  const descriptionLooksLikeShortQuestion =
    descriptionWords.size <= 5 && description.trim().endsWith("?");

  return overlapRatio >= 0.6 || descriptionLooksLikeShortQuestion;
}

function descriptiveFallbackByVariant(variant: ConfirmDialogVariant | undefined): string {
  if (variant === "danger") return "This action may be irreversible. Please confirm to continue.";
  if (variant === "warning") return "Please review this action carefully before continuing.";
  return "Please confirm that you want to proceed with this action.";
}

function resolveDialogDescription(
  title: string,
  message: ReactNode,
  variant: ConfirmDialogVariant | undefined,
): string {
  const resolvedMessage = asDialogText(message, "").trim();
  if (!resolvedMessage) return descriptiveFallbackByVariant(variant);
  if (normalizeDialogText(resolvedMessage) === normalizeDialogText(title)) {
    return descriptiveFallbackByVariant(variant);
  }
  if (isDescriptionTooSimilar(title, resolvedMessage)) {
    return descriptiveFallbackByVariant(variant);
  }
  return resolvedMessage;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const queueRef = useRef<QueueEntry[]>([]);
  const openRef = useRef(false);
  const entryRef = useRef<QueueEntry | null>(null);

  const attachEntry = useCallback((next: QueueEntry | null) => {
    entryRef.current = next;
    setEntry(next);
  }, []);

  const showNext = useCallback(() => {
    const queued = queueRef.current.shift();
    if (queued) {
      openRef.current = true;
      attachEntry(queued);
    } else {
      openRef.current = false;
      attachEntry(null);
    }
  }, [attachEntry]);

  const flushCurrent = useCallback(
    (result: boolean) => {
      const current = entryRef.current;
      if (!current) return;
      current.resolve(result);
      setConfirmLoading(false);
      openRef.current = false;
      attachEntry(null);
      queueMicrotask(() => {
        const next = queueRef.current.shift();
        if (next) {
          openRef.current = true;
          attachEntry(next);
        }
      });
    },
    [attachEntry],
  );

  const confirm = useCallback(
    (options: ConfirmDialogOptions) =>
      new Promise<boolean>((resolve) => {
        const item: QueueEntry = { options, resolve };
        if (!openRef.current) {
          openRef.current = true;
          attachEntry(item);
        } else {
          queueRef.current.push(item);
        }
      }),
    [attachEntry],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      if (confirmLoading) return;
      if (entryRef.current) {
        flushCurrent(false);
      }
    },
    [confirmLoading, flushCurrent],
  );

  const handleCancel = useCallback(() => {
    if (confirmLoading) return;
    flushCurrent(false);
  }, [confirmLoading, flushCurrent]);

  const handleConfirm = useCallback(async () => {
    const current = entryRef.current;
    if (!current || confirmLoading) return;
    const { onConfirm } = current.options;
    if (!onConfirm) {
      flushCurrent(true);
      return;
    }
    setConfirmLoading(true);
    try {
      await onConfirm();
      flushCurrent(true);
    } catch {
      setConfirmLoading(false);
      current.resolve(false);
    }
  }, [confirmLoading, flushCurrent]);

  const ctx = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmDialogContext.Provider value={ctx}>
      {children}
      {entry ? (
        <ConfirmDialog
          isOpen
          onOpenChange={handleOpenChange}
          title={asDialogText(entry.options.title, "Confirm Action")}
          description={resolveDialogDescription(
            asDialogText(entry.options.title, "Confirm Action"),
            entry.options.message,
            entry.options.variant,
          )}
          confirmText={entry.options.confirmText}
          cancelText={entry.options.cancelText}
          variant={entry.options.variant ?? "default"}
          isConfirmLoading={confirmLoading}
          onCancel={handleCancel}
          onConfirm={() => void handleConfirm()}
        />
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmDialogContext);
  if (!fn) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider.");
  }
  return fn;
}
