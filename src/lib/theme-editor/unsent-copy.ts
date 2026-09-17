import type { ThemeDocument } from "./api";

/*
 * A copy of the editor's unsent edits, kept on this device (localStorage) so a lost connection
 * or a closed tab loses nothing. One copy per member per store, holding the draft revision the
 * edits were made on. It is written while an edit is not on the server, cleared once it is, and
 * cleared for every store on sign-out. It holds the theme document and nothing else: never a
 * preview pass or a token.
 *
 * Two editor tabs share the one copy, so each copy names the tab that wrote it, and a tab
 * replaces or clears only its own (or the one it found when it opened): a save in one tab
 * must not wipe edits another tab could not send.
 *
 * Every storage call is wrapped: a private window or a full quota must not break the editor.
 */

const PREFIX = "pb-theme-unsent:";

export type UnsentCopy = {
  document: ThemeDocument;
  /** The server draft revision these edits were made on. */
  baseDraftRevision: number;
  savedAt: number;
  /** The editor tab that wrote it: a random id each time the editor opens. */
  tab: string;
};

export type CopyStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export function unsentCopyKey(userPublicId: string, storePublicId: string): string {
  return `${PREFIX}${userPublicId}:${storePublicId}`;
}

export function readUnsentCopy(storage: CopyStorage, key: string): UnsentCopy | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const copy = JSON.parse(raw) as Partial<UnsentCopy> | null;
    const document = copy?.document as Partial<ThemeDocument> | undefined;
    if (
      !document ||
      typeof document.theme !== "string" ||
      !document.templates ||
      typeof copy?.baseDraftRevision !== "number" ||
      typeof copy.savedAt !== "number" ||
      typeof copy.tab !== "string"
    ) {
      return null;
    }
    return copy as UnsentCopy;
  } catch {
    return null;
  }
}

/** False when the copy could not be kept (out of space, storage switched off); the edit still autosaves. */
export function writeUnsentCopy(storage: CopyStorage, key: string, copy: UnsentCopy): boolean {
  try {
    storage.setItem(key, JSON.stringify(copy));
    return true;
  } catch {
    return false;
  }
}

export function clearUnsentCopy(storage: CopyStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

/**
 * Whether a tab may replace or clear the stored copy: when there is none, when it wrote it, or
 * when it is the copy the tab found on opening (restored, asked about, or dropped as saved).
 * A copy another tab wrote after that holds edits only that tab has.
 */
export function mayReplaceUnsentCopy(stored: UnsentCopy | null, tabs: readonly (string | undefined)[]): boolean {
  return !stored || tabs.includes(stored.tab);
}

/** Sign-out: drop every store's copy on this device. */
export function clearAllUnsentCopies(storage: CopyStorage): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

/**
 * What to do with a copy found when the editor opens on the server's draft:
 * - "none": no copy, it matches the server (already saved), or it was made on another theme
 *   (the draft has switched theme since, which discards a draft anyway), so it is dropped;
 * - "restore": made on the draft the server still has, so the copy is newer: bring it back;
 * - "ask": the draft has changed since (another tab or device saved), so restoring would
 *   replace that: let the merchant choose.
 */
export function unsentCopyChoice(
  copy: UnsentCopy | null,
  server: { document: ThemeDocument; draftRevision: number },
): "none" | "restore" | "ask" {
  if (!copy || copy.document.theme !== server.document.theme) return "none";
  if (JSON.stringify(copy.document) === JSON.stringify(server.document)) return "none";
  return copy.baseDraftRevision === server.draftRevision ? "restore" : "ask";
}
