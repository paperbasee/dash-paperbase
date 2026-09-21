/**
 * A scheduled section's dates: Bangladesh wall clock in the form, UTC in the document.
 *
 * The whole point of converting rather than using `<input type="datetime-local">` is
 * that the browser's own timezone must not decide when a merchant's sale starts. A
 * merchant on a laptop still set to another zone would schedule Eid for the wrong hour
 * and nothing on the screen would say so — so the conversion is pinned here, in both
 * directions, against a timezone that is NOT Dhaka.
 */

import { describe, expect, test } from "vitest";

import { toBdParts, toUtcIso } from "@/lib/theme-editor/schedule-field";

describe("what the merchant typed → what is stored", () => {
  test("six in the evening in Dhaka is noon in UTC", () => {
    expect(toUtcIso("2026-09-25", "18:00")).toBe("2026-09-25T12:00:00Z");
  });

  test("a date with no time is the start of that day", () => {
    expect(toUtcIso("2026-09-25", "")).toBe("2026-09-24T18:00:00Z");
  });

  test("a date crossing midnight UTC still names the right instant", () => {
    // 04:00 in Dhaka is 22:00 the previous day in UTC.
    expect(toUtcIso("2026-09-25", "04:00")).toBe("2026-09-24T22:00:00Z");
  });

  test("no date is no bound, whatever the time box holds", () => {
    expect(toUtcIso("", "18:00")).toBe("");
    expect(toUtcIso("   ", "18:00")).toBe("");
  });

  test("a half-typed date stores nothing rather than a wrong instant", () => {
    expect(toUtcIso("2026-09", "18:00")).toBe("");
    expect(toUtcIso("nonsense", "18:00")).toBe("");
  });

  test("the stored shape is seconds and a Z, which is what the API normalises to", () => {
    expect(toUtcIso("2026-09-25", "18:00")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

describe("what is stored → what the boxes show", () => {
  test("noon UTC is shown as six in the evening", () => {
    expect(toBdParts("2026-09-25T12:00:00Z")).toEqual({ date: "2026-09-25", time: "18:00" });
  });

  test("an instant late in the UTC day is shown on the next Dhaka day", () => {
    expect(toBdParts("2026-09-25T22:00:00Z")).toEqual({ date: "2026-09-26", time: "04:00" });
  });

  test("nothing stored shows empty boxes rather than today", () => {
    for (const nothing of [undefined, null, "", "   ", 42, {}]) {
      expect(toBdParts(nothing)).toEqual({ date: "", time: "" });
    }
  });

  test("an unreadable value shows empty boxes rather than Invalid Date", () => {
    expect(toBdParts("not an instant")).toEqual({ date: "", time: "" });
  });
});

describe("a value that goes out and comes back is unchanged", () => {
  test.each([
    ["2026-09-25", "18:00"],
    ["2026-01-01", "00:00"],
    ["2026-12-31", "23:59"],
    ["2026-06-15", "04:00"],
  ])("%s %s", (date, time) => {
    const stored = toUtcIso(date, time);
    expect(toBdParts(stored)).toEqual({ date, time });
  });
});
