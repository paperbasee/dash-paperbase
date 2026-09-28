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
import { useTranslations } from "next-intl";

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
  /**
   * Require the user to type this exact value before Confirm becomes clickable.
   * Reserve it for actions with no undo -- a delete that really deletes. Overuse
   * turns it into another thing to click past.
   */
  requireTypedValue?: string;
  /** Localized label for that input; the caller owns the wording. */
  typedValueLabel?: string;
  onConfirm?: () => void | Promise<void>;
};

type QueueEntry = {
  options: ConfirmDialogOptions;
  resolve: (result: boolean) => void;
  /** What had focus when it was asked -- the Delete button, usually -- to go back to on close. */
  opener: HTMLElement | null;
};

type ConfirmFn = (options: ConfirmDialogOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | undefined>(undefined);

/**
 * Whether the caller gave this slot something to show. A string of spaces counts as nothing;
 * anything else it passed -- text, a number, its own markup -- is its words and is shown as
 * given.
 *
 * This replaces a rule that compared the message with the title and, when they shared enough
 * words or the message was a short question, threw the caller's sentence away and printed an
 * English one instead ("This action may be irreversible..."). A Bangla shop could see that on
 * a dialog whose own text was fine -- and the shorter and plainer the title, the likelier it
 * was. The caller's text now always wins; only a genuinely empty slot falls back, and it falls
 * back to translated copy.
 */
export function hasOwnText(value: ReactNode): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  return value !== null && value !== undefined && typeof value !== "boolean";
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const tCommon = useTranslations("common");
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
        const active = typeof document === "undefined" ? null : document.activeElement;
        const item: QueueEntry = { options, resolve, opener: active instanceof HTMLElement ? active : null };
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
          title={
            hasOwnText(entry.options.title) ? entry.options.title : tCommon("confirmPromptTitle")
          }
          description={
            hasOwnText(entry.options.message)
              ? entry.options.message
              : tCommon("confirmPromptMessage")
          }
          confirmText={entry.options.confirmText}
          cancelText={entry.options.cancelText}
          requireTypedValue={entry.options.requireTypedValue}
          typedValueLabel={entry.options.typedValueLabel}
          variant={entry.options.variant ?? "default"}
          isConfirmLoading={confirmLoading}
          returnFocusTo={entry.opener}
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
