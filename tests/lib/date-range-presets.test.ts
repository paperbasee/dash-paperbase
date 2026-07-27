import { describe, expect, it } from "vitest";
import { PRESET_DEFS, resolvePreset } from "@/lib/date-range-presets";

// Anchor: 2026-07-21T10:15:30.000Z == 2026-07-21 (Tuesday) 16:15:30 in Asia/Dhaka.
const NOW = new Date("2026-07-21T10:15:30.000Z");

describe("resolvePreset — relative sub-day (ISO instant) ranges", () => {
  it("last5m: exact 5-minute instant window with minute bucket", () => {
    const r = resolvePreset("last5m", NOW);
    expect(r).toEqual({
      startDate: "2026-07-21T10:10:30.000Z",
      endDate: "2026-07-21T10:15:30.000Z",
      bucket: "minute",
      preset: "last5m",
    });
  });

  it("last1h: exact 1-hour instant window with hour bucket", () => {
    const r = resolvePreset("last1h", NOW);
    expect(r).toEqual({
      startDate: "2026-07-21T09:15:30.000Z",
      endDate: "2026-07-21T10:15:30.000Z",
      bucket: "hour",
      preset: "last1h",
    });
  });

  it("last24h: exact 24-hour instant window", () => {
    const r = resolvePreset("last24h", NOW);
    expect(r?.startDate).toBe("2026-07-20T10:15:30.000Z");
    expect(r?.endDate).toBe(NOW.toISOString());
    expect(r?.bucket).toBe("hour");
  });
});

describe("resolvePreset — calendar day-precision ranges", () => {
  it.each([
    ["last2d", "2026-07-20", "2026-07-21", "day"],
    ["last7", "2026-07-15", "2026-07-21", "day"],
    ["last30", "2026-06-22", "2026-07-21", "day"],
    ["last90d", "2026-04-23", "2026-07-21", "day"],
  ] as const)("%s -> [%s, %s] bucket=%s", (key, start, end, bucket) => {
    const r = resolvePreset(key, NOW);
    expect(r).toMatchObject({ startDate: start, endDate: end, bucket, preset: key });
  });
});

describe("PRESET_DEFS", () => {
  it("every def resolves without throwing and returns its own key as preset", () => {
    for (const def of PRESET_DEFS) {
      const resolved = def.resolve(NOW);
      expect(resolved.preset).toBe(def.key);
      expect(resolved.startDate <= resolved.endDate).toBe(true);
    }
  });

  it("has no duplicate keys", () => {
    const keys = PRESET_DEFS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
