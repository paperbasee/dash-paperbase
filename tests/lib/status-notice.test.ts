import { describe, expect, it } from "vitest";

import { noticeTitle, noticeWhileAway, parseSummary, pickNotice, SOON_S, type StatusSummary } from "@/lib/status-notice";

const NOW = 1_790_791_200; // 2026-10-01 00:00 in Dhaka

const incident = (id: number, impact: string, started_at = NOW - 600) => ({
  id,
  title_en: `Incident ${id}`,
  title_bn: "",
  impact,
  status: "investigating",
  parts: ["checkout"],
  started_at,
  latest_en: "Looking.",
  latest_bn: "",
  latest_at: started_at,
});

const maintenanceWindow = (id: number, starts_at: number, ends_at: number) => ({
  id,
  title_en: `Maintenance ${id}`,
  title_bn: `রক্ষণাবেক্ষণ ${id}`,
  details_en: "",
  details_bn: "",
  parts: [],
  starts_at,
  ends_at,
  in_progress: starts_at <= NOW && NOW < ends_at,
});

const summary = (incidents: unknown[], maintenance: unknown[]): StatusSummary =>
  parseSummary({ overall: "operational", at: NOW, parts: [], incidents, maintenance })!;

describe("the status page's notice", () => {
  it("reads the summary carefully, leaving out what is not as expected", () => {
    expect(parseSummary(null)).toBeNull();
    expect(parseSummary({ incidents: "no" })).toBeNull();
    const read = summary(
      [incident(1, "major_outage"), { id: "x" }, incident(2, "made_up")],
      [maintenanceWindow(3, NOW + 60, NOW + 3600), { id: 4 }]
    );
    expect(read.incidents.map((i) => i.id)).toEqual([1]);
    expect(read.maintenance.map((m) => m.id)).toEqual([3]);
  });

  it("is nothing when all is well", () => {
    expect(pickNotice(summary([], []), NOW, new Set())).toBeNull();
  });

  it("shows the worst incident first, and says how many more there are", () => {
    const notice = pickNotice(
      summary([incident(1, "degraded"), incident(2, "major_outage"), incident(3, "partial_outage")], [
        maintenanceWindow(9, NOW - 60, NOW + 600),
      ]),
      NOW,
      new Set()
    );
    expect(notice).toMatchObject({ kind: "incident", id: 2, key: "incident-2", more: 3 });
  });

  it("puts maintenance now before maintenance ahead, and ahead only within a day", () => {
    const both = summary([], [maintenanceWindow(1, NOW + 3600, NOW + 7200), maintenanceWindow(2, NOW - 60, NOW + 600)]);
    expect(pickNotice(both, NOW, new Set())).toMatchObject({ kind: "maintenance_now", id: 2, more: 1 });

    const far = summary([], [maintenanceWindow(3, NOW + SOON_S + 60, NOW + SOON_S + 3600)]);
    expect(pickNotice(far, NOW, new Set())).toBeNull();
    expect(pickNotice(far, NOW + 120, new Set())).toMatchObject({ kind: "maintenance_soon", id: 3 });
  });

  it("stays away once put away, until something new happens", () => {
    const one = summary([incident(1, "partial_outage")], [maintenanceWindow(2, NOW + 3600, NOW + 7200)]);
    expect(pickNotice(one, NOW, new Set(["incident-1"]))).toMatchObject({ key: "maintenance-2-soon" });
    expect(pickNotice(one, NOW, new Set(["incident-1", "maintenance-2-soon"]))).toBeNull();
    // The maintenance that was coming has started: a new notice.
    expect(pickNotice(one, NOW + 3601, new Set(["incident-1", "maintenance-2-soon"]))).toMatchObject({
      key: "maintenance-2-now",
    });
  });

  it("tells the waiting page of an incident even if put away, and of maintenance now, never of maintenance ahead", () => {
    // Put away in the dashboard's bar, it is still why the waiting page is up.
    const open = summary([incident(1, "major_outage")], []);
    expect(pickNotice(open, NOW, new Set(["incident-1"]))).toBeNull();
    expect(noticeWhileAway(open, NOW)).toMatchObject({ kind: "incident", id: 1 });

    expect(noticeWhileAway(summary([], [maintenanceWindow(2, NOW - 60, NOW + 600)]), NOW)).toMatchObject({
      kind: "maintenance_now",
    });
    expect(noticeWhileAway(summary([], [maintenanceWindow(3, NOW + 3600, NOW + 7200)]), NOW)).toBeNull();
    expect(noticeWhileAway(summary([], []), NOW)).toBeNull();
  });

  it("speaks the merchant's language, English when no Bangla was written", () => {
    expect(noticeTitle({ title_en: "Checkout slow", title_bn: "" }, "bn")).toBe("Checkout slow");
    expect(noticeTitle({ title_en: "Checkout slow", title_bn: "চেকআউট ধীর" }, "bn")).toBe("চেকআউট ধীর");
    expect(noticeTitle({ title_en: "Checkout slow", title_bn: "চেকআউট ধীর" }, "en")).toBe("Checkout slow");
  });
});
