/**
 * The banner across the top of the dashboard while the status page has something to say: coloured
 * as the status page colours it, its words first -- no dot before them (owner, 2026-10-09).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StatusNoticeBar } from "@/components/status/StatusNoticeBar";
import type { StatusNotice } from "@/lib/status-notice";
import en from "../../messages/en.json";

const AT = Date.parse("2026-10-09T09:41:00Z") / 1000;

function render(notice: StatusNotice) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Dhaka">
      <StatusNoticeBar notice={notice} onDismiss={() => {}} />
    </NextIntlClientProvider>
  );
}

const incident = (impact: "degraded" | "partial_outage" | "major_outage"): StatusNotice => ({
  kind: "incident",
  key: `incident:${impact}`,
  more: 0,
  id: 7,
  title_en: "Dashboard down",
  title_bn: "",
  impact,
  status: "investigating",
  started_at: AT,
});

const maintenance: StatusNotice = {
  kind: "maintenance_now",
  key: "maintenance:3",
  more: 0,
  id: 3,
  title_en: "Moving sign-in",
  title_bn: "",
  starts_at: AT,
  ends_at: AT + 3600,
};

describe("the status banner", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_STATUS_URL", "https://status.example.test"));
  afterEach(() => vi.unstubAllEnvs());

  it("starts with its words, no dot before them, for maintenance and every incident", () => {
    for (const notice of [maintenance, incident("degraded"), incident("partial_outage"), incident("major_outage")]) {
      const html = render(notice);
      expect(html).not.toContain("rounded-full");
      expect(html).toMatch(/<div class="mx-auto[^"]*"><p/);
    }
  });

  it("keeps the status page's colour, the words and the link to the details", () => {
    const html = render(incident("major_outage"));
    expect(html).toContain("bg-red-50");
    expect(html).toContain("Dashboard down");
    expect(html).toMatch(/<a href="https:\/\/status.example.test"/);
    expect(render(maintenance)).toContain("bg-sky-50");
  });
});
