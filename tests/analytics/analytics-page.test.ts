/**
 * The redesigned analytics page (2026-09-28): the days it asks for, how it
 * writes numbers in both languages, what it calls things, the notes it works
 * out itself -- and that every word it uses exists in English and Bangla.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { makeFormat } from "@/app/[locale]/(dashboard)/analytics/_lib/format";
import { pageName, paymentName, sourceName } from "@/app/[locale]/(dashboard)/analytics/_lib/names";
import {
  dayCount,
  periodDays,
  periodFromParams,
  periodParams,
} from "@/app/[locale]/(dashboard)/analytics/_lib/period";
import { DIVISION_SHAPES, MAP_BOX } from "@/app/[locale]/(dashboard)/analytics/_lib/bangladesh-map";
import type { DistrictRow, DistrictsReport, SourceRow } from "@/app/[locale]/(dashboard)/analytics/_lib/types";
import {
  bestDay,
  busiestHours,
  changeOf,
  metricPoints,
  placeNotes,
  topSource,
  worthKnowing,
} from "@/app/[locale]/(dashboard)/analytics/_lib/insights";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const params = (query: string) => new URLSearchParams(query);

describe("the days asked for", () => {
  test("the last 7 days unless the address says otherwise", () => {
    expect(periodFromParams(params(""))).toEqual({ preset: "7", compare: "previous" });
    expect(periodFromParams(params("range=month&compare=year"))).toEqual({ preset: "month", compare: "year" });
    expect(periodFromParams(params("range=15"))).toEqual({ preset: "7", compare: "previous" });
  });

  test("any days up to today, as the API takes them", () => {
    const period = periodFromParams(params("start_date=2026-09-01&end_date=2026-09-10"));
    expect(period).toEqual({ preset: "custom", start: "2026-09-01", end: "2026-09-10", compare: "previous" });
    expect(periodParams(period)).toEqual({ start_date: "2026-09-01", end_date: "2026-09-10", compare: "previous" });
    expect(periodFromParams(params("start_date=2026-09-10&end_date=2026-09-01")).preset).toBe("7");
    expect(periodFromParams(params("start_date=2026-09-01&end_date=2999-01-01")).preset).toBe("7");
  });

  test("the days each preset covers", () => {
    const today = "2026-09-28";
    expect(periodDays({ preset: "today", compare: "previous" }, today)).toEqual({ start: today, end: today });
    expect(periodDays({ preset: "yesterday", compare: "previous" }, today)).toEqual({ start: "2026-09-27", end: "2026-09-27" });
    expect(periodDays({ preset: "7", compare: "previous" }, today)).toEqual({ start: "2026-09-22", end: today });
    expect(periodDays({ preset: "month", compare: "previous" }, today)).toEqual({ start: "2026-09-01", end: today });
    expect(dayCount("2026-09-22", "2026-09-28")).toBe(7);
  });
});

describe("numbers in both languages", () => {
  test("whole taka, grouped; Bangla digits on a Bangla dashboard", () => {
    expect(makeFormat("en", "৳").money("384250.40")).toBe("৳384,250");
    expect(makeFormat("bn", "৳").money("384250")).toBe("৳৩৮৪,২৫০");
    expect(makeFormat("en", "৳").percent(3.86)).toBe("3.9%");
  });

  test("time on the shop, days and hours", () => {
    expect(makeFormat("en", "").duration(102, { m: "m", s: "s" })).toBe("1m 42s");
    expect(makeFormat("bn", "").duration(42, { m: "মি", s: "সে" })).toBe("৪২সে");
    const days = makeFormat("en", "").days("2026-09-21", "2026-09-27");
    expect(days.startsWith("21 ") && days.includes(" – 27 ") && days.endsWith(" 2026")).toBe(true);
    expect(makeFormat("en", "").hourOfDay(21).replace(/\s/g, "").toLowerCase()).toBe("9pm");
    expect(makeFormat("bn", "").days("2026-09-21", "2026-09-21")).toContain("২১");
  });
});

describe("names", () => {
  const t = (key: string) => `«${key}»`;
  test("brands keep their names; what the API could not name is worded", () => {
    expect(sourceName("facebook", t)).toBe("Facebook");
    expect(sourceName("bdnews24.com", t)).toBe("bdnews24.com");
    expect(sourceName("(direct)", t)).toBe("«names.direct»");
    expect(sourceName("(not tracked)", t)).toBe("«names.notTracked»");
    expect(paymentName("cod", t)).toBe("«names.cod»");
    expect(paymentName("bkash", t)).toBe("bKash");
  });

  test("a page by its product's name, or by what it is", () => {
    expect(pageName({ kind: "product", name: "Pocket Tee", path: "/en/products/x" }, t)).toBe("Pocket Tee");
    expect(pageName({ kind: "home", name: "", path: "/en" }, t)).toBe("«pages.home»");
    expect(pageName({ kind: "other", name: "/en/x", path: "/en/x" }, t)).toBe("/en/x");
  });
});

describe("what the page works out itself", () => {
  test("the busiest two hours", () => {
    const hours = Array(24).fill(0);
    hours[21] = 5;
    hours[22] = 4;
    hours[9] = 6;
    expect(busiestHours(hours)).toEqual([21, 9]);
    expect(busiestHours(Array(24).fill(0))).toBeNull();
  });

  test("worth knowing: the top three districts' share, and where returns are highest", () => {
    const row = (key: string, sales: string, finished: number, returned: number) => ({
      key, name: key, name_bn: key, division: "dhaka", orders: 1, sales,
      parcels_finished: finished, delivered_rate: 100 - returned, returned_rate: returned,
    });
    const report = {
      divisions: [],
      districts: [row("dhaka", "500", 10, 5), row("gazipur", "300", 2, 50), row("bogura", "100", 4, 25), row("sylhet", "100", 3, 0)],
      not_recognised: { orders: 0, sales: "0" },
    } as unknown as DistrictsReport;
    const note = worthKnowing(report)!;
    expect(note.top).toEqual(["dhaka", "gazipur", "bogura"]);
    expect(note.topShare).toBe(90);
    expect(note.returns).toEqual([{ key: "bogura", rate: 25 }, { key: "dhaka", rate: 5 }]);
  });
});

describe("the Overview's story", () => {
  const series = {
    data: [
      { date: "2026-09-21", sales: "4000.00", orders: 2, visitors: 50 },
      { date: "2026-09-22", sales: "9000.00", orders: 3, visitors: 0 },
    ],
    comparison: [
      { date: "2026-09-14", sales: "5000.00", orders: 1, visitors: 40 },
      { date: "2026-09-15", sales: "6000.00", orders: 2, visitors: 20 },
    ],
  };

  test("each number's line, beside the compared day in the same place", () => {
    expect(metricPoints(series, "sales")).toEqual([
      { date: "2026-09-21", current: 4000, previous: 5000, previousDate: "2026-09-14" },
      { date: "2026-09-22", current: 9000, previous: 6000, previousDate: "2026-09-15" },
    ]);
    // Confirmed orders per hundred visitors, as the card counts them; no visitors, no rate.
    expect(metricPoints(series, "conversion").map((point) => [point.current, point.previous])).toEqual([[4, 2.5], [0, 10]]);
  });

  test("how far a number moved: a percentage, or a rate's points", () => {
    expect(changeOf(9000, 6000, "percent")).toBe(50);
    expect(changeOf(3.9, 3.7, "points")).toBe(0.2);
    expect(changeOf(5, 0, "percent")).toBeNull();
    expect(changeOf(5, null, "points")).toBeNull();
  });

  test("the best day, and what the same day before sold", () => {
    expect(bestDay(series)).toEqual({ date: "2026-09-22", sales: 9000, was: series.comparison[1] });
    expect(bestDay({ data: [{ date: "2026-09-21", sales: "0.00", orders: 0 }], comparison: [] })).toBeNull();
  });

  test("the source that brought the most sales -- never one the API could not name", () => {
    const source = (name: string, orders: number, sales: string) =>
      ({ source: name, visitors: 10, paid_visitors: 0, orders, sales, conversion: 0 }) as SourceRow;
    expect(topSource([source("(not tracked)", 9, "9000"), source("tiktok", 2, "800"), source("facebook", 3, "1200")])?.source).toBe("facebook");
    expect(topSource([source("google", 0, "0")])).toBeNull();
  });

  test("the district that ordered most, and the one delivered least often", () => {
    const row = (key: string, orders: number, finished: number, delivered: number) =>
      ({ key, name: key, name_bn: key, division: "dhaka", orders, sales: "0", parcels_finished: finished, delivered_rate: delivered, returned_rate: 100 - delivered }) as DistrictRow;
    const notes = placeNotes([row("gazipur", 4, 4, 75), row("dhaka", 9, 8, 90), row("bogura", 1, 2, 50), row("sylhet", 2, 3, 100)]);
    expect(notes?.most.key).toBe("dhaka");
    expect(notes?.lowest?.key).toBe("gazipur");
    expect(placeNotes([row("dhaka", 0, 0, 0)])).toBeNull();
  });
});

describe("the division map", () => {
  test("one shape for each of the API's eight divisions, its name inside the box", () => {
    // api-paperbase engine/apps/orders/districts.py, DIVISIONS
    expect(Object.keys(DIVISION_SHAPES).sort()).toEqual(
      ["barishal", "chattogram", "dhaka", "khulna", "mymensingh", "rajshahi", "rangpur", "sylhet"],
    );
    for (const shape of Object.values(DIVISION_SHAPES)) {
      expect(shape.path).toMatch(/^M[\d.]+ [\d.]+l.*z$/);
      const [x, y] = shape.label;
      expect(x > 0 && x < MAP_BOX.width && y > 0 && y < MAP_BOX.height).toBe(true);
    }
  });
});

describe("every word the page uses, in both languages", () => {
  const root = path.resolve(__dirname, "../../src/app/[locale]/(dashboard)/analytics");
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? files(full) : /\.tsx?$/.test(entry.name) ? [full] : [];
    });
  const text = files(root).map((file) => fs.readFileSync(file, "utf8")).join("\n");

  const lookup = (tree: unknown, key: string) =>
    key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree);

  test("the page's words have the same keys in English and Bangla", () => {
    const flat = (tree: object, prefix = ""): string[] =>
      Object.entries(tree).flatMap(([key, value]) =>
        value && typeof value === "object" ? flat(value, `${prefix}${key}.`) : [`${prefix}${key}`],
      );
    expect(flat(bn.analyticsPage).sort()).toEqual(flat(en.analyticsPage).sort());
  });

  test("every word looked up by name is there", () => {
    const period = new Set(["custom", "days", "vsYesterday", "vsLastMonth", "vsPreviousDays", "vsLastYear", "compareWith",
      "againstDays", "againstYesterday", "againstLastMonth", "againstLastYear", "pickTitle", "pickHint", "pickApply"]);
    const missing = [...text.matchAll(/\bt(?:\.rich)?\("([a-zA-Z0-9_.]+)"/g)]
      .map((m) => m[1])
      .map((key) => (period.has(key) ? `period.${key}` : key === "label" ? "sections.label" : key))
      .filter((key) => typeof lookup(en.analyticsPage, key) !== "string");
    expect([...new Set(missing)]).toEqual([]);
  });
});
