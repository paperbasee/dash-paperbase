import { describe, expect, it } from "vitest";

import {
  computeUnread,
  formatWhatsNewDate,
  readLastSeen,
  whatsNewStorageKey,
  writeLastSeen,
  type StorageLike,
} from "@/lib/whats-new/unread";

const ENTRIES = [{ id: "c-newest" }, { id: "b-middle" }, { id: "a-oldest" }];

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
};

describe("whatsNewStorageKey", () => {
  it("is scoped to the signed-in user", () => {
    expect(whatsNewStorageKey("usr_1")).not.toBe(whatsNewStorageKey("usr_2"));
    expect(whatsNewStorageKey("usr_1")).toContain("usr_1");
  });
});

describe("readLastSeen", () => {
  it("returns no id on a first visit", () => {
    expect(readLastSeen(() => memoryStorage(), "usr_1")).toEqual({ kind: "ok", id: null });
  });

  it("returns the stored id for that user only", () => {
    const storage = memoryStorage({ [whatsNewStorageKey("usr_1")]: "b-middle" });
    expect(readLastSeen(() => storage, "usr_1")).toEqual({ kind: "ok", id: "b-middle" });
    expect(readLastSeen(() => storage, "usr_2")).toEqual({ kind: "ok", id: null });
  });

  it("reports blocked storage instead of throwing", () => {
    expect(readLastSeen(() => throwingStorage, "usr_1")).toEqual({ kind: "blocked" });
    expect(
      readLastSeen(() => {
        throw new DOMException("no localStorage", "SecurityError");
      }, "usr_1"),
    ).toEqual({ kind: "blocked" });
    expect(readLastSeen(() => null, "usr_1")).toEqual({ kind: "blocked" });
  });

  it("treats a missing user as blocked so nothing is tracked under a shared key", () => {
    expect(readLastSeen(() => memoryStorage(), null)).toEqual({ kind: "blocked" });
    expect(readLastSeen(() => memoryStorage(), "")).toEqual({ kind: "blocked" });
  });
});

describe("writeLastSeen", () => {
  it("stores the id under the user's key", () => {
    const storage = memoryStorage();
    expect(writeLastSeen(() => storage, "usr_1", "c-newest")).toBe(true);
    expect(storage.data[whatsNewStorageKey("usr_1")]).toBe("c-newest");
  });

  it("returns false instead of throwing when storage is blocked or the user is unknown", () => {
    expect(writeLastSeen(() => throwingStorage, "usr_1", "c-newest")).toBe(false);
    expect(
      writeLastSeen(() => {
        throw new DOMException("no localStorage", "SecurityError");
      }, "usr_1", "c-newest"),
    ).toBe(false);
    expect(writeLastSeen(() => memoryStorage(), null, "c-newest")).toBe(false);
  });
});

describe("computeUnread", () => {
  it("first visit: shows the dot and marks every entry new", () => {
    const state = computeUnread(ENTRIES, { kind: "ok", id: null });
    expect(state.hasUnread).toBe(true);
    expect([...state.newIds]).toEqual(["c-newest", "b-middle", "a-oldest"]);
  });

  it("newest already seen: no dot and nothing new", () => {
    const state = computeUnread(ENTRIES, { kind: "ok", id: "c-newest" });
    expect(state.hasUnread).toBe(false);
    expect(state.newIds.size).toBe(0);
  });

  it("older stored id: shows the dot and marks only the newer entries new", () => {
    const state = computeUnread(ENTRIES, { kind: "ok", id: "a-oldest" });
    expect(state.hasUnread).toBe(true);
    expect([...state.newIds]).toEqual(["c-newest", "b-middle"]);
  });

  it("unknown stored id (pruned or garbage): shows the dot and marks every entry new", () => {
    const state = computeUnread(ENTRIES, { kind: "ok", id: "2020-01-01-removed-long-ago" });
    expect(state.hasUnread).toBe(true);
    expect(state.newIds.size).toBe(ENTRIES.length);
  });

  it("blocked storage: no dot and nothing marked new", () => {
    const state = computeUnread(ENTRIES, { kind: "blocked" });
    expect(state.hasUnread).toBe(false);
    expect(state.newIds.size).toBe(0);
  });

  it("no entries: no dot", () => {
    expect(computeUnread([], { kind: "ok", id: null }).hasUnread).toBe(false);
  });

  it("round trip: opening stores the newest id and clears the dot", () => {
    const storage = memoryStorage({ [whatsNewStorageKey("usr_1")]: "a-oldest" });
    const before = computeUnread(ENTRIES, readLastSeen(() => storage, "usr_1"));
    expect(before.hasUnread).toBe(true);
    writeLastSeen(() => storage, "usr_1", ENTRIES[0].id);
    const after = computeUnread(ENTRIES, readLastSeen(() => storage, "usr_1"));
    expect(after.hasUnread).toBe(false);
  });
});

describe("formatWhatsNewDate", () => {
  it("formats the calendar date in the active locale without shifting the day", () => {
    expect(formatWhatsNewDate("2026-09-15", "en")).toBe("15 September 2026");
    const bn = formatWhatsNewDate("2026-09-15", "bn");
    expect(bn).toContain("১৫");
    expect(bn).toContain("২০২৬");
    expect(bn).not.toMatch(/[0-9]/);
  });

  it("returns the raw value for a malformed date instead of throwing", () => {
    expect(formatWhatsNewDate("not-a-date", "en")).toBe("not-a-date");
  });
});
