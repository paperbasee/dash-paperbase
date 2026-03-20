import { describe, expect, it } from "vitest";
import { normalizeDateRange } from "@/lib/validation/date-range";

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

  it("keeps max window within 90 days", () => {
    const today = new Date("2026-03-20T10:00:00Z");
    const normalized = normalizeDateRange(
      {
        startDate: "2025-10-01",
        endDate: "2026-03-20",
        bucket: "day",
        preset: "custom",
      },
      today
    );

    expect(normalized.startDate).toBe("2025-12-20");
  });
});
