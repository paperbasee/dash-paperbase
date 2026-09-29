import { describe, expect, it } from "vitest";

import { readSellsOn, sameSellsOn, toggleSellsOn } from "@/lib/sells-on";

describe("toggleSellsOn", () => {
  it("picks any places, kept in setup's order", () => {
    expect(toggleSellsOn(["tiktok"], "facebook")).toEqual(["facebook", "tiktok"]);
    expect(toggleSellsOn(["facebook", "tiktok"], "in_person")).toEqual(["facebook", "tiktok", "in_person"]);
  });

  it("takes a picked place off again", () => {
    expect(toggleSellsOn(["facebook", "tiktok"], "facebook")).toEqual(["tiktok"]);
    expect(toggleSellsOn(["starting"], "starting")).toEqual([]);
  });

  it("lets just starting stand alone", () => {
    expect(toggleSellsOn(["facebook", "instagram"], "starting")).toEqual(["starting"]);
    expect(toggleSellsOn(["starting"], "instagram")).toEqual(["instagram"]);
  });
});

describe("readSellsOn", () => {
  it("keeps only known answers, in order", () => {
    expect(readSellsOn(["tiktok", "daraz", "facebook"])).toEqual(["facebook", "tiktok"]);
    expect(readSellsOn(null)).toEqual([]);
    expect(readSellsOn("facebook")).toEqual([]);
  });
});

describe("sameSellsOn", () => {
  it("compares what was picked", () => {
    expect(sameSellsOn(["facebook", "tiktok"], ["facebook", "tiktok"])).toBe(true);
    expect(sameSellsOn(["facebook"], ["facebook", "tiktok"])).toBe(false);
    expect(sameSellsOn([], [])).toBe(true);
  });
});
