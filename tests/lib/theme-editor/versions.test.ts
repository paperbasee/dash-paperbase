/**
 * How a history row reads: "Version 12 · 14 Sep, 3:40 PM", and the same line in Bangla with
 * Bangla digits and a Bangla month. The time is the shop's own (Asia/Dhaka), so an evening save
 * never reads as the next morning.
 */

import { describe, expect, test } from "vitest";

import { versionMoment, versionNumber } from "@/lib/theme-editor/versions";

describe("the version number", () => {
  test("is written in the reader's digits", () => {
    expect(versionNumber(12, "en")).toBe("12");
    expect(versionNumber(12, "bn")).toBe("১২");
    expect(versionNumber(20, "bn")).toBe("২০");
  });
});

describe("when it was saved", () => {
  // 2026-09-14 09:40 UTC is 3:40 PM in Dhaka, the same day.
  const afternoon = "2026-09-14T09:40:00Z";

  test("reads day, month and time, in each language", () => {
    expect(versionMoment(afternoon, "en")).toBe("14 Sep, 3:40 PM");
    expect(versionMoment(afternoon, "bn")).toBe("১৪ সেপ্ট, ৩:৪০ PM");
  });

  test("is the shop's own day: late evening UTC is already tomorrow in Dhaka", () => {
    // 2026-09-14 20:30 UTC is 2:30 AM on the 15th in Dhaka.
    expect(versionMoment("2026-09-14T20:30:00Z", "en")).toBe("15 Sep, 2:30 AM");
    expect(versionMoment("2026-09-14T20:30:00Z", "bn")).toBe("১৫ সেপ্ট, ২:৩০ AM");
  });

  test("a date that cannot be read is a dash, never a wrong day", () => {
    expect(versionMoment("not a date", "en")).toBe("—");
    expect(versionMoment("", "bn")).toBe("—");
  });
});
