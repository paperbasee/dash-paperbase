/**
 * The setup guide as a strip (owner's pick B of three, 2026-11-26): one slim row of tiles at the top
 * of the home page, the next step dark, each tile going straight to where its step is done. Steps
 * done follow the open ones, greyed; making the shop is said in the header, as setup did it.
 */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { SetupGuideCard } from "@/components/setup-guide/SetupGuideCard";
import { PremiumTrialCard } from "@/app/[locale]/onboarding/PremiumTrialCard";
import type { SetupGuide } from "@/lib/setup-guide";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function render(node: ReactNode, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka">
      {node}
    </NextIntlClientProvider>
  );
}

const guide = (done: string[] = []): SetupGuide => ({
  show: true,
  steps: (["shop", "product", "delivery", "courier", "facebook_pixel", "instagram"] as const).map((key) => ({
    key,
    done: key === "shop" || done.includes(key),
  })),
});

describe("the setup guide strip", () => {
  it("shows the open steps in the API's order, the first one as next, each a way to where it is done", () => {
    const html = render(<SetupGuideCard guide={guide()} />);
    const order = ["Add your first product", "Set delivery charges", "Connect a courier", "Add your Facebook Pixel", "Link your Instagram"];
    const at = order.map((title) => html.indexOf(title));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html.match(/>Next</g)).toHaveLength(1);
    expect(html.indexOf(">Next<")).toBeLessThan(html.indexOf("Set delivery charges"));
    for (const href of ["/products/new", "/shipping", "/settings?tab=integrations", "/settings?tab=store"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("says the shop is made in its header rather than as a tile, and counts it as done", () => {
    const html = render(<SetupGuideCard guide={guide()} />);
    expect(html).toContain("Shop created");
    expect(html).not.toContain("Create your shop");
    expect(html).toContain("1 of 6 done");
    expect(html.match(/data-segment="done"/g)).toHaveLength(1);
    expect(html.match(/data-segment="open"/g)).toHaveLength(5);
  });

  it("puts a finished step after the open ones, greyed and going nowhere", () => {
    const html = render(<SetupGuideCard guide={guide(["delivery"])} />);
    expect(html.indexOf("Set delivery charges")).toBeGreaterThan(html.indexOf("Link your Instagram"));
    expect(html).not.toContain('href="/shipping"');
    expect(html).toContain("2 of 6 done");
  });

  it("speaks Bangla, its numbers too", () => {
    const html = render(<SetupGuideCard guide={guide()} />, "bn");
    expect(html).toContain("প্রথম পণ্য যোগ করুন");
    expect(html).toContain("৬টির মধ্যে ১টি শেষ");
    expect(html).not.toMatch(/>(Next|Start|Shop created)</);
  });

  it("offers Skip only where it is given", () => {
    expect(render(<SetupGuideCard guide={guide()} />)).not.toContain("Skip setup");
    expect(render(<SetupGuideCard guide={guide()} onSkip={() => undefined} />)).toContain("Skip setup");
  });
});

describe("the free trial at setup's end", () => {
  const trial = { days: 7, endsAt: "2026-12-03T14:03:00+00:00" };

  it("says the days and when the trial ends, in Dhaka's time, with the way to the plans", () => {
    const html = render(<PremiumTrialCard trial={trial} />);
    expect(html).toContain("days of Premium, on us");
    expect(html).toContain('<span class="sr-only">7</span>');
    expect(html).toContain("3 Dec 2026, 8:03 pm");
    expect(html).toContain('href="/plans"');
  });

  it("rolls from 0 to the trial's days, and no further", () => {
    const html = render(<PremiumTrialCard trial={{ ...trial, days: 14 }} />);
    expect(html).toContain(">0<");
    expect(html).toContain(">14<");
    expect(html).not.toContain(">15<");
  });

  it("speaks Bangla, its numbers too", () => {
    const html = render(<PremiumTrialCard trial={trial} />, "bn");
    expect(html).toContain("দিনের প্রিমিয়াম");
    expect(html).toContain('<span class="sr-only">৭</span>');
  });
});
