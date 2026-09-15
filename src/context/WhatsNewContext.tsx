"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { WHATS_NEW_ENTRIES } from "@/content/whats-new";
import WhatsNewPanel from "@/components/whats-new/WhatsNewPanel";
import {
  computeUnread,
  readLastSeen,
  WHATS_NEW_SEEN_EVENT,
  writeLastSeen,
  type LastSeen,
} from "@/lib/whats-new/unread";

interface WhatsNewContextValue {
  /** Show the unread dot on the profile menu and its What's new item. */
  hasUnread: boolean;
  /**
   * Opens the panel and marks everything as seen. `returnFocusTo` gets focus back when the
   * panel closes (the profile menu trigger), if it is still on the page.
   */
  openPanel: (returnFocusTo?: HTMLElement | null) => void;
}

const WhatsNewContext = createContext<WhatsNewContextValue | undefined>(undefined);

export function useWhatsNew() {
  const ctx = useContext(WhatsNewContext);
  if (ctx === undefined) {
    throw new Error("useWhatsNew must be used within WhatsNewProvider");
  }
  return ctx;
}

const getLocalStorage = () => window.localStorage;

/** Sentinel snapshot for unavailable storage; a primitive so useSyncExternalStore stays stable. */
const BLOCKED = Symbol("whats-new-storage-blocked");
type Snapshot = string | null | typeof BLOCKED;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(WHATS_NEW_SEEN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(WHATS_NEW_SEEN_EVENT, onChange);
  };
}

function toLastSeen(snapshot: Snapshot): LastSeen {
  return snapshot === BLOCKED ? { kind: "blocked" } : { kind: "ok", id: snapshot };
}

export function WhatsNewProvider({ children }: { children: ReactNode }) {
  const { meProfile, meProfileStatus } = useAuth();
  const userId = meProfileStatus === "ready" ? (meProfile?.public_id ?? null) : null;

  const snapshot = useSyncExternalStore<Snapshot>(
    subscribe,
    () => {
      const result = readLastSeen(getLocalStorage, userId);
      return result.kind === "blocked" ? BLOCKED : result.id;
    },
    // Server render and hydration: no dot, so markup never depends on this browser's storage.
    () => BLOCKED,
  );

  const { hasUnread } = useMemo(
    () => computeUnread(WHATS_NEW_ENTRIES, toLastSeen(snapshot)),
    [snapshot],
  );

  const [open, setOpen] = useState(false);
  /** Entries that were unread at the moment the panel opened; kept until it closes. */
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(() => new Set());
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openPanel = useCallback(
    (returnFocusTo?: HTMLElement | null) => {
      returnFocusRef.current = returnFocusTo ?? null;
      setNewIds(computeUnread(WHATS_NEW_ENTRIES, toLastSeen(snapshot)).newIds);
      setOpen(true);

      const newest = WHATS_NEW_ENTRIES[0];
      if (newest && snapshot !== BLOCKED && snapshot !== newest.id) {
        if (writeLastSeen(getLocalStorage, userId, newest.id)) {
          window.dispatchEvent(new Event(WHATS_NEW_SEEN_EVENT));
        }
      }
    },
    [snapshot, userId],
  );

  const handleCloseAutoFocus = useCallback((event: Event) => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected) {
      event.preventDefault();
      target.focus();
    }
  }, []);

  const value = useMemo(() => ({ hasUnread, openPanel }), [hasUnread, openPanel]);

  return (
    <WhatsNewContext.Provider value={value}>
      {children}
      <WhatsNewPanel
        open={open}
        onOpenChange={setOpen}
        entries={WHATS_NEW_ENTRIES}
        newIds={newIds}
        onCloseAutoFocus={handleCloseAutoFocus}
      />
    </WhatsNewContext.Provider>
  );
}
