/**
 * The copy of unsent edits kept on this device: one per member per store, never anything but
 * the document, its base revision and the tab that wrote it, safe when storage misbehaves,
 * cleared on sign-out, never replaced by another open tab, and brought back only when it is
 * newer than the server's draft (asked about when the draft has moved on since).
 */

import { describe, expect, test } from "vitest";

import {
  clearAllUnsentCopies,
  clearUnsentCopy,
  mayReplaceUnsentCopy,
  readUnsentCopy,
  unsentCopyChoice,
  unsentCopyKey,
  writeUnsentCopy,
  type CopyStorage,
} from "@/lib/theme-editor/unsent-copy";
import { document } from "./fixtures";

function memoryStorage(initial: Record<string, string> = {}): CopyStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

const throwing: CopyStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
  key: () => {
    throw new Error("SecurityError");
  },
  get length(): number {
    throw new Error("SecurityError");
  },
};

const KEY = unsentCopyKey("usr_1", "str_gadzilla");

describe("storage", () => {
  test("one key per member per store", () => {
    expect(KEY).toBe("pb-theme-unsent:usr_1:str_gadzilla");
    expect(unsentCopyKey("usr_2", "str_gadzilla")).not.toBe(KEY);
    expect(unsentCopyKey("usr_1", "str_testville")).not.toBe(KEY);
  });

  test("writes and reads back exactly the document, its base revision, when, and which tab", () => {
    const storage = memoryStorage();
    const copy = { document: document(), baseDraftRevision: 7, savedAt: 1_700_000_000_000, tab: "tab_a" };
    expect(writeUnsentCopy(storage, KEY, copy)).toBe(true);
    expect(JSON.parse(storage.data.get(KEY)!)).toEqual(copy);
    expect(Object.keys(JSON.parse(storage.data.get(KEY)!)).sort()).toEqual(["baseDraftRevision", "document", "savedAt", "tab"]);
    expect(readUnsentCopy(storage, KEY)).toEqual(copy);
    clearUnsentCopy(storage, KEY);
    expect(readUnsentCopy(storage, KEY)).toBeNull();
  });

  test("anything that is not a copy reads as none", () => {
    for (const raw of [
      "not json",
      "null",
      "[]",
      JSON.stringify({ document: document(), baseDraftRevision: "7", savedAt: 1, tab: "a" }),
      JSON.stringify({ document: { theme: 1 }, baseDraftRevision: 7, savedAt: 1, tab: "a" }),
      JSON.stringify({ baseDraftRevision: 7, savedAt: 1, tab: "a" }),
      JSON.stringify({ document: document(), baseDraftRevision: 7, savedAt: 1 }),
    ]) {
      expect(readUnsentCopy(memoryStorage({ [KEY]: raw }), KEY)).toBeNull();
    }
  });

  test("storage that throws never breaks the editor", () => {
    expect(readUnsentCopy(throwing, KEY)).toBeNull();
    // A copy that could not be kept says so: a reload must not count on it.
    expect(writeUnsentCopy(throwing, KEY, { document: document(), baseDraftRevision: 1, savedAt: 1, tab: "a" })).toBe(false);
    expect(() => clearUnsentCopy(throwing, KEY)).not.toThrow();
    expect(() => clearAllUnsentCopies(throwing)).not.toThrow();
  });

  test("sign-out clears every store's copy and nothing else", () => {
    const storage = memoryStorage({
      [KEY]: "{}",
      [unsentCopyKey("usr_1", "str_testville")]: "{}",
      access_token: "kept",
      "pb-theme-other": "kept",
    });
    clearAllUnsentCopies(storage);
    expect([...storage.data.keys()].sort()).toEqual(["access_token", "pb-theme-other"]);
  });
});

describe("two tabs share one copy", () => {
  const copy = (tab: string) => ({ document: document(), baseDraftRevision: 7, savedAt: 1, tab });

  test("with no copy stored, any tab may write", () => {
    expect(mayReplaceUnsentCopy(null, ["tab_b", undefined])).toBe(true);
  });

  test("a tab replaces or clears its own copy, and the one it found on opening", () => {
    expect(mayReplaceUnsentCopy(copy("tab_a"), ["tab_a", undefined])).toBe(true);
    expect(mayReplaceUnsentCopy(copy("tab_old"), ["tab_c", "tab_old"])).toBe(true);
  });

  test("a save in one tab never wipes the copy another tab wrote after it opened", () => {
    const storage = memoryStorage();
    // A and B open with nothing stored. A's save is refused (409), so its edits go in the copy.
    const tabsA = ["tab_a", undefined] as const;
    const tabsB = ["tab_b", undefined] as const;
    writeUnsentCopy(storage, KEY, copy("tab_a"));
    // B edits and saves: it may neither write over A's copy nor clear it.
    expect(mayReplaceUnsentCopy(readUnsentCopy(storage, KEY), tabsB)).toBe(false);
    // A reloads and finds its edits; the reopened tab takes that copy over.
    expect(mayReplaceUnsentCopy(readUnsentCopy(storage, KEY), tabsA)).toBe(true);
    const found = readUnsentCopy(storage, KEY);
    expect(found?.tab).toBe("tab_a");
    expect(mayReplaceUnsentCopy(found, ["tab_a2", found?.tab])).toBe(true);
  });
});

describe("unsentCopyChoice", () => {
  const server = { document: document(), draftRevision: 7 };
  const changed = () => {
    const doc = document();
    doc.templates.home.sections[0].hidden = true;
    return doc;
  };

  test("no copy, or one the server already has, is nothing to bring back", () => {
    expect(unsentCopyChoice(null, server)).toBe("none");
    expect(unsentCopyChoice({ document: document(), baseDraftRevision: 6, savedAt: 1, tab: "a" }, server)).toBe("none");
  });

  test("edits made on another theme are dropped: the draft has switched theme since", () => {
    const other = { ...changed(), theme: "minimal" };
    expect(unsentCopyChoice({ document: other, baseDraftRevision: 7, savedAt: 1, tab: "a" }, server)).toBe("none");
    expect(unsentCopyChoice({ document: other, baseDraftRevision: 5, savedAt: 1, tab: "a" }, server)).toBe("none");
  });

  test("edits made on the draft the server still has are restored", () => {
    expect(unsentCopyChoice({ document: changed(), baseDraftRevision: 7, savedAt: 1, tab: "a" }, server)).toBe("restore");
  });

  test("edits made on a draft that has changed since are asked about", () => {
    expect(unsentCopyChoice({ document: changed(), baseDraftRevision: 5, savedAt: 1, tab: "a" }, server)).toBe("ask");
    expect(unsentCopyChoice({ document: changed(), baseDraftRevision: 9, savedAt: 1, tab: "a" }, server)).toBe("ask");
  });
});
