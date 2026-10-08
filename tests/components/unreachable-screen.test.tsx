/**
 * The waiting page (owner, 2026-10-09: "we will show a screen ... each screen will have different
 * animation"): Paperbase's API away, sign-in away, or the device offline -- each its own drawing
 * and words, the status page's word on it, when the next ask is, and nothing that cannot work
 * while that part is away.
 */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StatusSummary } from "@/lib/status-notice";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const status = vi.hoisted(() => ({ summary: null as StatusSummary | null }));

vi.mock("@/hooks/useStatusNotice", () => ({
  useStatusSummary: () => ({ summary: status.summary, now: Date.parse("2026-10-09T09:45:00Z") }),
}));
vi.mock("@/lib/auth", () => ({ signOut: async () => {} }));

const { default: UnreachableScreen } = await import("@/components/unreachable/UnreachableScreen");

type Part = "api" | "signIn" | "offline";

function render(part: Part, { locale = "en", checking = false, secondsLeft = 12 } = {}) {
  const node: ReactNode = (
    <UnreachableScreen part={part} checking={checking} secondsLeft={secondsLeft} onTryNow={() => {}} />
  );
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka">
      {node}
    </NextIntlClientProvider>
  );
}

const STARTED = Date.parse("2026-10-09T09:41:00Z") / 1000; // 3:41 PM in Dhaka

const incident = (status_: string): StatusSummary => ({
  incidents: [{ id: 7, title_en: "Dashboard down", title_bn: "", impact: "degraded", status: status_, started_at: STARTED }],
  maintenance: [],
});

describe("the waiting page", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_STATUS_URL", "https://status.example.test");
    status.summary = null;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("puts the drawing first: no name across the top (owner, 2026-10-09)", () => {
    for (const part of ["api", "signIn", "offline"] as const) {
      const html = render(part);
      expect(html).not.toContain("<header");
      expect(html.indexOf("<svg")).toBeLessThan(html.indexOf("<h1"));
      expect(html.slice(0, html.indexOf("<svg"))).not.toContain("Paperbase");
    }
  });

  it("draws each part away its own way, as decoration, and stills it for less motion", () => {
    const drawings = (["api", "signIn", "offline"] as const).map((part) => {
      const html = render(part);
      expect(html).toContain("pb-motion");
      expect(html).toMatch(/<svg viewBox="0 0 320 240" fill="none" aria-hidden="true" class="pb-art/);
      return html.match(/<svg[\s\S]*?<\/svg>/)![0];
    });
    expect(new Set(drawings).size).toBe(3);
    expect(drawings[0]).toContain("pb-typing"); // the server thinking
    expect(drawings[1]).toContain("pb-scan"); // the card being scanned
    expect(drawings[2]).toContain("pb-wave"); // the router searching
  });

  it("Paperbase away: says it is on our side, links the status page, counts down, and offers sign out", () => {
    const html = render("api");
    expect(html).toContain("<h1");
    expect(html).toContain("Paperbase isn&#x27;t answering right now");
    expect(html).toContain("you won&#x27;t need to sign in again");
    expect(html).toContain("Try now");
    expect(html).toMatch(/<a href="https:\/\/status.example.test" target="_blank"[^>]*>See Paperbase status/);
    expect(html).toContain("Checking again in 12 seconds");
    expect(html).toContain("Sign out");
  });

  it("counts in words that fit the number, and says when it is asking", () => {
    expect(render("api", { secondsLeft: 1 })).toContain("Checking again in 1 second<");
    expect(render("api", { checking: true })).toContain("Checking now…");
    expect(render("api", { locale: "bn", secondsLeft: 12 })).toContain("১২ সেকেন্ড পর আবার দেখা হবে");
  });

  it("sign-in away: no sign out, which needs sign-in", () => {
    const html = render("signIn");
    expect(html).toContain("Paperbase&#x27;s sign-in isn&#x27;t answering");
    expect(html).toContain("Your shop keeps selling.");
    expect(html).toContain("See Paperbase status");
    expect(html).not.toContain("Sign out");
  });

  it("offline: the device's own internet -- no status page, no sign out, waits for the connection", () => {
    status.summary = incident("investigating");
    const html = render("offline");
    expect(html).toContain("You&#x27;re offline");
    expect(html).toContain('<span class="whitespace-nowrap">Wi-Fi</span>');
    expect(html).toContain("Waiting for your connection");
    expect(html).not.toContain("Status page");
    expect(html).not.toContain("See Paperbase status");
    expect(html).not.toContain("Sign out");
  });

  it("says what the status page says: the incident and since when, or nothing reported yet", () => {
    status.summary = incident("investigating");
    expect(render("api")).toContain("Status page: we&#x27;re looking into it, since 3:41 PM");
    status.summary = incident("identified");
    expect(render("api")).toContain("Status page: we&#x27;ve found the cause, since 3:41 PM");
    status.summary = { incidents: [], maintenance: [] };
    expect(render("api")).toContain("Status page: nothing reported yet");
    // The status page did not answer either: no line at all.
    status.summary = null;
    expect(render("api")).not.toContain("Status page");
  });

  it("without a status page, no link to one", () => {
    vi.stubEnv("NEXT_PUBLIC_STATUS_URL", "");
    expect(render("api")).not.toContain("See Paperbase status");
  });
});
