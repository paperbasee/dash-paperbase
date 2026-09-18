/**
 * A time on a Bangla screen says the part of the day, not "AM"/"PM". CLDR bn still gives the
 * Latin words, so `formatDashboardTime` replaces them; English is untouched.
 */

import { describe, expect, test } from "vitest";

import { formatDashboardTime } from "@/lib/datetime-display";

/** An hour of the Dhaka clock, as an ISO instant (Dhaka is UTC+6). */
function atDhakaHour(hour24: number, minute = 0): string {
  const utcHour = (hour24 - 6 + 24) % 24;
  const day = hour24 < 6 ? 15 : 14;
  return `2026-09-${day}T${String(utcHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
}

describe("the time on a dashboard row", () => {
  test("English keeps AM and PM", () => {
    expect(formatDashboardTime(atDhakaHour(15, 40), "en")).toBe("3:40 PM");
    expect(formatDashboardTime(atDhakaHour(2, 30), "en")).toBe("2:30 AM");
  });

  test("Bangla says the part of the day first, in Bangla digits", () => {
    expect(formatDashboardTime(atDhakaHour(15, 40), "bn")).toBe("দুপুর ৩:৪০");
    expect(formatDashboardTime(atDhakaHour(2, 30), "bn")).toBe("রাত ২:৩০");
  });

  test("no Latin letter survives in Bangla, at any hour", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      expect(formatDashboardTime(atDhakaHour(hour, 5), "bn")).not.toMatch(/[A-Za-z]/);
    }
  });

  test("each part of the day starts where it should", () => {
    const part = (hour: number) => formatDashboardTime(atDhakaHour(hour), "bn").split(" ")[0];
    expect([part(0), part(3)]).toEqual(["রাত", "রাত"]);
    expect([part(4), part(11)]).toEqual(["সকাল", "সকাল"]);
    expect([part(12), part(15)]).toEqual(["দুপুর", "দুপুর"]);
    expect([part(16), part(17)]).toEqual(["বিকেল", "বিকেল"]);
    expect([part(18), part(19)]).toEqual(["সন্ধ্যা", "সন্ধ্যা"]);
    expect([part(20), part(23)]).toEqual(["রাত", "রাত"]);
  });

  test("a date that cannot be read is a dash in both languages", () => {
    expect(formatDashboardTime("not a date", "en")).toBe("—");
    expect(formatDashboardTime("", "bn")).toBe("—");
  });
});
