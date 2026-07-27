import { describe, expect, it } from "vitest";
import { MAX_LOOKBACK_DAYS, normalizeDateRange } from "@/lib/validation/date-range";

describe("normalizeDateRange", () => {
  it("clamps future end date to today", () => {
    const today = new Date("2026-03-20T10:00:00Z");
    const normalized = normalizeDateRange(
      {
        startDate: "2026-03-19",
        endDate: "2026-03-30",
        bucket: "day",
        preset: "custom",
      },
      today
    );

    expect(normalized.endDate).toBe("2026-03-20");
  });

  it("does not clamp a window well within the lookback cap", () => {
    const today = new Date("2026-03-20T10:00:00Z");
    const normalized = normalizeDateRange(
      {
        startDate: "2026-01-15",
        endDate: "2026-03-20",
        bucket: "day",
        preset: "custom",
      },
      today
    );

    expect(normalized.startDate).toBe("2026-01-15");
  });

  it("clamps a window beyond MAX_LOOKBACK_DAYS", () => {
    const today = new Date("2026-03-20T10:00:00Z");
    const normalized = normalizeDateRange(
      {
        startDate: "2020-01-01",
        endDate: "2026-03-20",
        bucket: "day",
        preset: "custom",
      },
      today
    );

    expect(normalized.startDate).not.toBe("2020-01-01");
    const spanDays = Math.round(
      (Date.parse(normalized.endDate) - Date.parse(normalized.startDate)) / 86_400_000
    );
    expect(spanDays).toBe(MAX_LOOKBACK_DAYS);
  });

  it("leaves sub-day (ISO instant) ranges untouched", () => {
    const today = new Date("2026-03-20T10:00:00Z");
    const value = {
      startDate: "2026-03-20T09:30:00.000Z",
      endDate: "2026-03-20T10:00:00.000Z",
      bucket: "minute" as const,
      preset: "last30m" as const,
    };
    const normalized = normalizeDateRange(value, today);
    expect(normalized).toEqual(value);
  });

  it("uses hourly bucket for a single calendar day", () => {
    const today = new Date("2026-03-20T10:00:00Z");
    const normalized = normalizeDateRange(
      {
        startDate: "2026-03-18",
        endDate: "2026-03-18",
        bucket: "day",
        preset: "custom",
      },
      today
    );

    expect(normalized.startDate).toBe("2026-03-18");
    expect(normalized.endDate).toBe("2026-03-18");
    expect(normalized.bucket).toBe("hour");
  });
});
